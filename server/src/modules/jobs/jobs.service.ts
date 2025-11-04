import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../lib/prisma.service.js'
import { AwsEbsService } from '../../lib/aws/ebs.service.js'
import { AwsRdsService } from '../../lib/aws/rds.service.js'
import { AwsS3Service } from '../../lib/aws/s3.service.js'
import { LocalBackupService } from '../../lib/local-backup.service.js'
import { AuditService } from '../../lib/audit.service.js'
import { SlackService } from '../../lib/slack.service.js'
import { NotionService } from '../../lib/notion.service.js'
import { CloudWatchService } from '../../lib/cloudwatch.service.js'

export type CreateJobInput = {
  resourceType: string
  resourceId: string
  schedule: string
  status?: string
}

export type UpdateJobInput = Partial<CreateJobInput>

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private ebs: AwsEbsService,
    private rds: AwsRdsService,
    private s3: AwsS3Service,
    private local: LocalBackupService,
    private audit: AuditService,
    private slack: SlackService,
    private notion: NotionService,
    private cloudwatch: CloudWatchService
  ) {}

  list() {
    return this.prisma.backupJob.findMany({ orderBy: { createdAt: 'desc' } })
  }

  create(input: CreateJobInput) {
    return this.prisma.backupJob.create({ data: input }).then(async (job) => {
      await this.audit.log('job.create', 'BackupJob', job.id, { input })
      return job
    })
  }

  update(id: string, input: UpdateJobInput) {
    return this.prisma.backupJob.update({ where: { id }, data: input }).then(async (job) => {
      await this.audit.log('job.update', 'BackupJob', id, { input })
      return job
    })
  }

  async run(id: string) {
    const job = await this.prisma.backupJob.findUnique({ where: { id } })
    if (!job) throw new Error('Job not found')

    const startTime = Date.now()

    const run = await this.prisma.jobRun.create({
      data: { jobId: job.id, status: 'pending' },
    })

    try {
      let result: any = null
      let metrics: any = {}

      // 백업 타입별 실행
      switch (job.resourceType) {
        case 'EBS':
          result = await this.ebs.createSnapshot(job.resourceId, `Job ${job.id}`)
          metrics = { snapshotId: result?.SnapshotId || result?.Snapshot?.SnapshotId }
          break

        case 'RDS':
          result = await this.rds.createSnapshot(job.resourceId)
          metrics = {
            snapshotId: result.snapshotId,
            status: result.status,
            engine: result.engine,
            allocatedStorage: result.allocatedStorage,
          }
          break

        case 'S3':
          // resourceId 형식: "source-bucket/prefix:target-bucket/prefix"
          const [source, target] = job.resourceId.split(':')
          const [sourceBucket, sourcePrefix = ''] = source.split('/')
          const [targetBucket, targetPrefix = ''] = target.split('/')

          result = await this.s3.syncBucket(sourceBucket, sourcePrefix, targetBucket, targetPrefix)
          metrics = {
            totalObjects: result.totalObjects,
            copiedCount: result.copiedCount,
            errorCount: result.errorCount,
            totalBytes: result.copiedObjects.reduce((sum: number, obj: any) => sum + (obj.size || 0), 0),
          }
          break

        case 'LOCAL':
          // resourceId 형식: "source-path:target-path"
          const [sourcePath, targetPath] = job.resourceId.split(':')

          // 경로 존재 여부 확인
          const sourceExists = await this.local.checkPathExists(sourcePath)
          if (!sourceExists) {
            throw new Error(`Source path does not exist: ${sourcePath}`)
          }

          result = await this.local.backupDirectory(sourcePath, targetPath)
          metrics = {
            logPath: result.logPath,
            totalFiles: result.stats.totalFiles,
            copiedFiles: result.stats.copiedFiles,
            totalBytes: result.stats.totalBytes,
            copiedBytes: result.stats.copiedBytes,
          }
          break

        default:
          throw new Error(`Unsupported resourceType: ${job.resourceType}`)
      }

      const updatedRun = await this.prisma.jobRun.update({
        where: { id: run.id },
        data: { status: 'success', endedAt: new Date(), metrics },
      })

      await this.audit.log('job.run.success', 'JobRun', run.id, { jobId: job.id, metrics })

      // CloudWatch 메트릭 전송 (비동기, 실패해도 무시)
      const duration = Date.now() - startTime
      const backupSize = metrics.totalBytes || metrics.copiedBytes || metrics.allocatedStorage
      this.cloudwatch
        .putBackupMetrics(job.id, job.resourceType, 'success', duration, backupSize)
        .catch((err) => console.error('CloudWatch metrics failed:', err))

      // Notion에 자동 기록 (비동기, 실패해도 무시)
      this.notion.logJobRun(updatedRun, job).catch((err) => {
        console.error('Notion sync failed:', err.message)
      })

      return { runId: run.id, status: 'success', metrics }
    } catch (err: any) {
      const failedRun = await this.prisma.jobRun.update({
        where: { id: run.id },
        data: { status: 'failed', endedAt: new Date(), error: String(err?.message || err) },
      })

      await this.audit.log('job.run.failed', 'JobRun', run.id, { jobId: job.id, error: String(err?.message || err) })

      // Slack 실패 알림 (개선된 포맷)
      await this.slack.notifyBackupFailure(job, failedRun).catch((slackErr) => {
        console.error('Slack notification failed:', slackErr)
      })

      // CloudWatch 실패 메트릭 전송
      const duration = Date.now() - startTime
      this.cloudwatch
        .putBackupMetrics(job.id, job.resourceType, 'failed', duration)
        .catch((cwErr) => console.error('CloudWatch metrics failed:', cwErr))

      // Notion에 실패 기록 (비동기, 실패해도 무시)
      this.notion.logJobRun(failedRun, job).catch((notionErr) => {
        console.error('Notion sync failed:', notionErr.message)
      })

      throw err
    }
  }
}

