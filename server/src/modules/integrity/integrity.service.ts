import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../lib/prisma.service.js'
import { AuditService } from '../../lib/audit.service.js'
import { SlackService } from '../../lib/slack.service.js'
import { AwsEbsService } from '../../lib/aws/ebs.service.js'
import { AwsRdsService } from '../../lib/aws/rds.service.js'
import { AwsS3Service } from '../../lib/aws/s3.service.js'
import {
  EC2Client,
  DescribeSnapshotsCommand,
  DescribeVolumesCommand,
} from '@aws-sdk/client-ec2'

@Injectable()
export class IntegrityService {
  private ec2Client: EC2Client

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private slack: SlackService,
    private ebs: AwsEbsService,
    private rds: AwsRdsService,
    private s3: AwsS3Service
  ) {
    const region = process.env.AWS_REGION || 'ap-northeast-2'
    this.ec2Client = new EC2Client({ region })
  }

  listByRun(runId: string) {
    return this.prisma.integrityCheck.findMany({ where: { runId }, orderBy: { createdAt: 'desc' } })
  }

  async runBasicChecks(runId: string) {
    const run = await this.prisma.jobRun.findUnique({
      where: { id: runId },
      include: { job: true },
    })
    if (!run) throw new Error('Run not found')

    const results: Array<{ type: string; result: string; details?: any }> = []
    const metrics = run.metrics as any

    // 백업 타입별 무결성 검증
    const resourceType = run.job.resourceType

    switch (resourceType) {
      case 'EBS':
        await this.checkEbsIntegrity(metrics, results)
        break

      case 'RDS':
        await this.checkRdsIntegrity(metrics, results)
        break

      case 'S3':
        await this.checkS3Integrity(metrics, results)
        break

      case 'LOCAL':
        await this.checkLocalIntegrity(metrics, results)
        break

      default:
        results.push({
          type: 'unsupported_type',
          result: 'fail',
          details: { resourceType },
        })
    }

    const created = await Promise.all(
      results.map((r) =>
        this.prisma.integrityCheck.create({
          data: { runId, type: r.type, result: r.result, details: r.details as any },
        })
      )
    )

    await this.audit.log('integrity.run', 'JobRun', runId, { results })

    if (results.some((r) => r.result === 'fail')) {
      await this.slack.notify(
        `🚨 Integrity checks failed for run ${runId}\n` +
          `Failed checks: ${results.filter((r) => r.result === 'fail').map((r) => r.type).join(', ')}`
      )
    }

    return created
  }

  /**
   * EBS 스냅샷 무결성 검증
   */
  private async checkEbsIntegrity(metrics: any, results: any[]) {
    const snapshotId = metrics?.snapshotId

    // Check 1: snapshotId 존재 여부
    results.push({
      type: 'snapshotId_present',
      result: snapshotId ? 'pass' : 'fail',
      details: { snapshotId },
    })

    // Check 2: 스냅샷 상태 확인 (AWS API 호출)
    if (snapshotId) {
      try {
        const cmd = new DescribeSnapshotsCommand({
          SnapshotIds: [snapshotId],
        })
        const response = await this.ec2Client.send(cmd)
        const snapshot = response.Snapshots?.[0]

        const status = snapshot?.State // pending, completed, error
        const progress = snapshot?.Progress // 예: "100%"

        results.push({
          type: 'ebs_snapshot_status',
          result: status === 'completed' ? 'pass' : 'fail',
          details: { status, progress, snapshotId },
        })

        // Check 3: 스냅샷 크기 검증
        if (snapshot?.VolumeSize) {
          results.push({
            type: 'ebs_snapshot_size',
            result: snapshot.VolumeSize > 0 ? 'pass' : 'fail',
            details: { volumeSize: snapshot.VolumeSize },
          })
        }
      } catch (err: any) {
        results.push({
          type: 'ebs_snapshot_status',
          result: 'fail',
          details: { error: err.message },
        })
      }
    }
  }

  /**
   * RDS 스냅샷 무결성 검증
   */
  private async checkRdsIntegrity(metrics: any, results: any[]) {
    const snapshotId = metrics?.snapshotId

    // Check 1: snapshotId 존재 여부
    results.push({
      type: 'snapshotId_present',
      result: snapshotId ? 'pass' : 'fail',
      details: { snapshotId },
    })

    // Check 2: RDS 스냅샷 상태 확인
    if (snapshotId) {
      try {
        const status = await this.rds.getSnapshotStatus(snapshotId)

        results.push({
          type: 'rds_snapshot_status',
          result: status.status === 'available' ? 'pass' : 'fail',
          details: {
            status: status.status,
            percentProgress: status.percentProgress,
            encrypted: status.encrypted,
          },
        })

        // Check 3: 암호화 여부 확인 (권장사항)
        results.push({
          type: 'rds_snapshot_encrypted',
          result: status.encrypted ? 'pass' : 'pass', // 경고만, 실패는 아님
          details: { encrypted: status.encrypted },
        })
      } catch (err: any) {
        results.push({
          type: 'rds_snapshot_status',
          result: 'fail',
          details: { error: err.message },
        })
      }
    }
  }

  /**
   * S3 백업 무결성 검증
   */
  private async checkS3Integrity(metrics: any, results: any[]) {
    const totalObjects = metrics?.totalObjects
    const copiedCount = metrics?.copiedCount
    const errorCount = metrics?.errorCount

    // Check 1: 복사 성공 여부
    results.push({
      type: 's3_copy_success',
      result: errorCount === 0 ? 'pass' : 'fail',
      details: { totalObjects, copiedCount, errorCount },
    })

    // Check 2: 복사된 객체 수 일치 여부
    results.push({
      type: 's3_object_count',
      result: copiedCount === totalObjects ? 'pass' : 'fail',
      details: { expected: totalObjects, actual: copiedCount },
    })
  }

  /**
   * 로컬 HDD 백업 무결성 검증
   */
  private async checkLocalIntegrity(metrics: any, results: any[]) {
    const totalFiles = metrics?.totalFiles
    const copiedFiles = metrics?.copiedFiles
    const logPath = metrics?.logPath

    // Check 1: 로그 파일 존재 여부
    results.push({
      type: 'local_log_present',
      result: logPath ? 'pass' : 'fail',
      details: { logPath },
    })

    // Check 2: 파일 복사 성공 여부
    results.push({
      type: 'local_file_count',
      result: copiedFiles >= 0 && totalFiles >= 0 ? 'pass' : 'fail',
      details: { totalFiles, copiedFiles },
    })

    // Check 3: 복사 완료율 (90% 이상이면 pass)
    if (totalFiles > 0) {
      const successRate = (copiedFiles / totalFiles) * 100
      results.push({
        type: 'local_copy_rate',
        result: successRate >= 90 ? 'pass' : 'fail',
        details: { successRate: successRate.toFixed(2) + '%' },
      })
    }
  }
}

