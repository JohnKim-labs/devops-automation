import { Injectable } from '@nestjs/common'
import { Client } from '@notionhq/client'

export interface NotionBackupEntry {
  date: string // ISO 날짜 형식
  week?: string // 1주차, 2주차, 3주차, 4주차
  category: string[] // AWS Snapshot, RDS Dump, S3 Sync, Local HDD Backup 등
  status: '✅ 완료' | '⚠️ 점검필요' | '❌ 실패'
  summary: string
  systemHealth?: '정상' | '주의' | '이상'
  backupSize?: number // GB
  dbVerified?: boolean
  securityCheck?: boolean
  slackLogLink?: string
  reportLink?: string
  improvement?: string
  manager?: string // Notion user ID (선택사항)
}

@Injectable()
export class NotionService {
  private client: Client | null = null
  private databaseId: string | null = null

  constructor() {
    const notionToken = process.env.NOTION_TOKEN
    const notionDatabaseId = process.env.NOTION_DATABASE_ID

    if (notionToken && notionDatabaseId) {
      this.client = new Client({ auth: notionToken })
      this.databaseId = notionDatabaseId
    }
  }

  /**
   * Notion이 설정되어 있는지 확인합니다.
   */
  isConfigured(): boolean {
    return this.client !== null && this.databaseId !== null
  }

  /**
   * Notion DB에 백업 로그 항목을 추가합니다.
   * @param entry 백업 로그 데이터
   * @returns 생성된 페이지 정보
   */
  async createBackupEntry(entry: NotionBackupEntry) {
    if (!this.isConfigured()) {
      return { skipped: true, reason: 'Notion not configured' }
    }

    try {
      const properties: any = {
        Date: {
          date: {
            start: entry.date,
          },
        },
        Summary: {
          rich_text: [
            {
              text: {
                content: entry.summary,
              },
            },
          ],
        },
        Status: {
          status: {
            name: entry.status,
          },
        },
        Category: {
          multi_select: entry.category.map((cat) => ({ name: cat })),
        },
      }

      // 선택적 필드 추가
      if (entry.week) {
        properties.Week = { select: { name: entry.week } }
      }

      if (entry.systemHealth) {
        properties.System_Health = { select: { name: entry.systemHealth } }
      }

      if (entry.backupSize !== undefined) {
        properties.Backup_Size = { number: entry.backupSize }
      }

      if (entry.dbVerified !== undefined) {
        properties.DB_Verified = { checkbox: entry.dbVerified }
      }

      if (entry.securityCheck !== undefined) {
        properties.Security_Check = { checkbox: entry.securityCheck }
      }

      if (entry.slackLogLink) {
        properties.Slack_Log_Link = { url: entry.slackLogLink }
      }

      if (entry.reportLink) {
        properties.Report_Link = { url: entry.reportLink }
      }

      if (entry.improvement) {
        properties.Improvement = {
          rich_text: [{ text: { content: entry.improvement } }],
        }
      }

      const response = await this.client!.pages.create({
        parent: { database_id: this.databaseId! },
        properties,
      })

      return {
        ok: true,
        pageId: response.id,
        url: ('url' in response) ? response.url : undefined,
      }
    } catch (err: any) {
      console.error('Notion API error:', err.message)
      return {
        ok: false,
        error: err.message,
      }
    }
  }

  /**
   * 백업 작업 실행 결과를 Notion에 자동 기록합니다.
   * @param jobRun JobRun 데이터
   * @param job BackupJob 데이터
   */
  async logJobRun(jobRun: any, job: any) {
    if (!this.isConfigured()) {
      return { skipped: true }
    }

    const metrics = jobRun.metrics as any
    const category = this.mapResourceTypeToCategory(job.resourceType)
    const status = jobRun.status === 'success' ? '✅ 완료' : '❌ 실패'

    let summary = `${job.resourceType} 백업: ${job.resourceId}`
    if (jobRun.status === 'failed' && jobRun.error) {
      summary += `\n에러: ${jobRun.error}`
    }

    // 백업 크기 계산 (bytes → GB)
    let backupSizeGB: number | undefined
    if (metrics?.totalBytes) {
      backupSizeGB = Math.round((metrics.totalBytes / (1024 * 1024 * 1024)) * 100) / 100
    } else if (metrics?.copiedBytes) {
      backupSizeGB = Math.round((metrics.copiedBytes / (1024 * 1024 * 1024)) * 100) / 100
    }

    const entry: NotionBackupEntry = {
      date: jobRun.startedAt || new Date().toISOString(),
      category: [category],
      status,
      summary,
      backupSize: backupSizeGB,
      dbVerified: jobRun.status === 'success',
      systemHealth: jobRun.status === 'success' ? '정상' : '이상',
    }

    return await this.createBackupEntry(entry)
  }

  /**
   * resourceType을 Notion Category로 매핑합니다.
   */
  private mapResourceTypeToCategory(resourceType: string): string {
    const mapping: Record<string, string> = {
      EBS: 'AWS Snapshot',
      RDS: 'RDS Dump',
      S3: 'S3 Sync',
      LOCAL: 'Local HDD Backup',
    }
    return mapping[resourceType] || resourceType
  }

  /**
   * 주간 리포트를 생성하여 Notion에 추가합니다.
   * @param weekNumber 주차 (1, 2, 3, 4)
   * @param stats 통계 데이터
   */
  async createWeeklyReport(weekNumber: number, stats: any) {
    if (!this.isConfigured()) {
      return { skipped: true }
    }

    const week = `${weekNumber}주차`
    const summary = `주간 백업 리포트\n총 ${stats.totalRuns}건 실행, 성공률 ${stats.successRate}%`

    const entry: NotionBackupEntry = {
      date: new Date().toISOString(),
      week,
      category: ['보안 점검'],
      status: stats.successRate >= 90 ? '✅ 완료' : '⚠️ 점검필요',
      summary,
      systemHealth: stats.successRate >= 90 ? '정상' : '주의',
    }

    return await this.createBackupEntry(entry)
  }
}
