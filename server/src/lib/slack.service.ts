import { Injectable } from '@nestjs/common'

@Injectable()
export class SlackService {
  private webhook = process.env.SLACK_WEBHOOK_URL

  /**
   * 기본 텍스트 알림을 전송합니다.
   */
  async notify(text: string, blocks?: any[]) {
    if (!this.webhook) return { skipped: true }
    const res = await fetch(this.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blocks ? { text, blocks } : { text }),
    })
    return { ok: res.ok }
  }

  /**
   * 백업 작업 성공 알림을 전송합니다.
   * @param job BackupJob 데이터
   * @param run JobRun 데이터
   * @param metrics 백업 메트릭
   */
  async notifyBackupSuccess(job: any, run: any, metrics: any) {
    if (!this.webhook) return { skipped: true }

    const duration = run.endedAt && run.startedAt
      ? Math.round((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
      : 0

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ 백업 작업 성공',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*타입:*\n${job.resourceType}` },
          { type: 'mrkdwn', text: `*리소스:*\n${job.resourceId}` },
          { type: 'mrkdwn', text: `*실행 시간:*\n${duration}초` },
          { type: 'mrkdwn', text: `*Job ID:*\n${job.id.slice(0, 8)}...` },
        ],
      },
    ]

    // 메트릭 정보 추가
    if (metrics) {
      const metricsText = []
      if (metrics.snapshotId) metricsText.push(`스냅샷 ID: ${metrics.snapshotId}`)
      if (metrics.totalFiles) metricsText.push(`파일 수: ${metrics.copiedFiles}/${metrics.totalFiles}`)
      if (metrics.totalObjects) metricsText.push(`객체 수: ${metrics.copiedCount}/${metrics.totalObjects}`)

      if (metricsText.length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*메트릭:*\n${metricsText.join('\n')}`,
          },
        })
      }
    }

    const res = await fetch(this.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `백업 성공: ${job.resourceType} - ${job.resourceId}`,
        blocks,
      }),
    })

    return { ok: res.ok }
  }

  /**
   * 백업 작업 실패 알림을 전송합니다.
   * @param job BackupJob 데이터
   * @param run JobRun 데이터
   */
  async notifyBackupFailure(job: any, run: any) {
    if (!this.webhook) return { skipped: true }

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ 백업 작업 실패',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*타입:*\n${job.resourceType}` },
          { type: 'mrkdwn', text: `*리소스:*\n${job.resourceId}` },
          { type: 'mrkdwn', text: `*Job ID:*\n${job.id}` },
          { type: 'mrkdwn', text: `*시각:*\n${new Date().toLocaleString('ko-KR')}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*에러 메시지:*\n\`\`\`${run.error || 'Unknown error'}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚠️ 즉시 확인이 필요합니다.',
          },
        ],
      },
    ]

    const res = await fetch(this.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `백업 실패: ${job.resourceType} - ${job.resourceId}`,
        blocks,
      }),
    })

    return { ok: res.ok }
  }

  /**
   * 주간 백업 리포트를 전송합니다.
   * @param weekNumber 주차 (1-4)
   * @param stats 통계 데이터
   */
  async sendWeeklyReport(weekNumber: number, stats: any) {
    if (!this.webhook) return { skipped: true }

    const successEmoji = stats.successRate >= 90 ? '✅' : stats.successRate >= 70 ? '⚠️' : '❌'

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 ${weekNumber}주차 백업 리포트`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*총 실행:*\n${stats.totalRuns}건` },
          { type: 'mrkdwn', text: `*성공:*\n${stats.successCount}건` },
          { type: 'mrkdwn', text: `*실패:*\n${stats.failureCount}건` },
          { type: 'mrkdwn', text: `*성공률:*\n${successEmoji} ${stats.successRate.toFixed(1)}%` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*평균 실행 시간:* ${stats.avgDuration}초`,
        },
      },
    ]

    if (stats.failedJobs && stats.failedJobs.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*실패한 작업:*\n${stats.failedJobs.map((job: any) => `• ${job.resourceType}: ${job.resourceId}`).join('\n')}`,
        },
      })
    }

    const res = await fetch(this.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${weekNumber}주차 백업 리포트 - 성공률 ${stats.successRate.toFixed(1)}%`,
        blocks,
      }),
    })

    return { ok: res.ok }
  }
}

