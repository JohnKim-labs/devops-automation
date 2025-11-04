import { Injectable } from '@nestjs/common'
import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch'

@Injectable()
export class CloudWatchService {
  private client: CloudWatchClient | null = null
  private namespace: string = 'DROX/DevOps'

  constructor() {
    const region = process.env.AWS_REGION || 'ap-northeast-2'

    // CloudWatch는 선택적 기능 (AWS 자격증명이 없어도 동작)
    try {
      this.client = new CloudWatchClient({ region })
    } catch (err) {
      console.warn('CloudWatch client initialization failed:', err)
    }
  }

  /**
   * CloudWatch가 설정되어 있는지 확인합니다.
   */
  isEnabled(): boolean {
    return this.client !== null
  }

  /**
   * 백업 작업 실행 메트릭을 전송합니다.
   * @param jobId 작업 ID
   * @param resourceType 백업 타입 (EBS, RDS, S3, LOCAL)
   * @param status 실행 상태 (success, failed)
   * @param duration 실행 시간 (밀리초)
   * @param backupSize 백업 크기 (바이트)
   */
  async putBackupMetrics(
    jobId: string,
    resourceType: string,
    status: 'success' | 'failed',
    duration: number,
    backupSize?: number
  ) {
    if (!this.isEnabled()) {
      return { skipped: true, reason: 'CloudWatch not enabled' }
    }

    const timestamp = new Date()

    const metricData: any[] = [
      // 메트릭 1: 백업 실행 카운트
      {
        MetricName: 'BackupExecutions',
        Value: 1,
        Unit: StandardUnit.Count,
        Timestamp: timestamp,
        Dimensions: [
          { Name: 'JobId', Value: jobId },
          { Name: 'ResourceType', Value: resourceType },
          { Name: 'Status', Value: status },
        ],
      },
      // 메트릭 2: 실행 시간
      {
        MetricName: 'BackupDuration',
        Value: duration / 1000, // 초 단위로 변환
        Unit: StandardUnit.Seconds,
        Timestamp: timestamp,
        Dimensions: [
          { Name: 'JobId', Value: jobId },
          { Name: 'ResourceType', Value: resourceType },
        ],
      },
    ]

    // 메트릭 3: 백업 크기 (선택사항)
    if (backupSize !== undefined && backupSize > 0) {
      metricData.push({
        MetricName: 'BackupSize',
        Value: backupSize / (1024 * 1024 * 1024), // GB 단위로 변환
        Unit: StandardUnit.Gigabytes,
        Timestamp: timestamp,
        Dimensions: [
          { Name: 'JobId', Value: jobId },
          { Name: 'ResourceType', Value: resourceType },
        ],
      })
    }

    // 메트릭 4: 성공/실패 카운트 (전체)
    metricData.push({
      MetricName: status === 'success' ? 'BackupSuccess' : 'BackupFailures',
      Value: 1,
      Unit: StandardUnit.Count,
      Timestamp: timestamp,
      Dimensions: [{ Name: 'ResourceType', Value: resourceType }],
    })

    try {
      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: metricData,
      })

      await this.client!.send(command)

      return { ok: true, metricsCount: metricData.length }
    } catch (err: any) {
      console.error('CloudWatch putMetricData failed:', err.message)
      return { ok: false, error: err.message }
    }
  }

  /**
   * 무결성 검증 메트릭을 전송합니다.
   * @param runId 실행 ID
   * @param totalChecks 전체 검증 수
   * @param passedChecks 통과한 검증 수
   * @param failedChecks 실패한 검증 수
   */
  async putIntegrityMetrics(
    runId: string,
    totalChecks: number,
    passedChecks: number,
    failedChecks: number
  ) {
    if (!this.isEnabled()) {
      return { skipped: true }
    }

    const timestamp = new Date()
    const successRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0

    const metricData = [
      {
        MetricName: 'IntegrityCheckSuccessRate',
        Value: successRate,
        Unit: StandardUnit.Percent,
        Timestamp: timestamp,
        Dimensions: [{ Name: 'RunId', Value: runId }],
      },
      {
        MetricName: 'IntegrityCheckFailures',
        Value: failedChecks,
        Unit: StandardUnit.Count,
        Timestamp: timestamp,
      },
    ]

    try {
      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: metricData,
      })

      await this.client!.send(command)
      return { ok: true }
    } catch (err: any) {
      console.error('CloudWatch putMetricData failed:', err.message)
      return { ok: false, error: err.message }
    }
  }

  /**
   * 시스템 헬스 메트릭을 전송합니다.
   * @param totalJobs 전체 잡 수
   * @param activeJobs 활성 잡 수
   * @param recentFailures 최근 실패 수
   */
  async putSystemHealthMetrics(
    totalJobs: number,
    activeJobs: number,
    recentFailures: number
  ) {
    if (!this.isEnabled()) {
      return { skipped: true }
    }

    const timestamp = new Date()

    const metricData = [
      {
        MetricName: 'TotalJobs',
        Value: totalJobs,
        Unit: StandardUnit.Count,
        Timestamp: timestamp,
      },
      {
        MetricName: 'ActiveJobs',
        Value: activeJobs,
        Unit: StandardUnit.Count,
        Timestamp: timestamp,
      },
      {
        MetricName: 'RecentFailures',
        Value: recentFailures,
        Unit: StandardUnit.Count,
        Timestamp: timestamp,
      },
    ]

    try {
      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: metricData,
      })

      await this.client!.send(command)
      return { ok: true }
    } catch (err: any) {
      console.error('CloudWatch putMetricData failed:', err.message)
      return { ok: false, error: err.message }
    }
  }
}
