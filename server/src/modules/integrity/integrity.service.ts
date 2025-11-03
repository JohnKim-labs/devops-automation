import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../lib/prisma.service.js'
import { AuditService } from '../../lib/audit.service.js'
import { SlackService } from '../../lib/slack.service.js'

@Injectable()
export class IntegrityService {
  constructor(private prisma: PrismaService, private audit: AuditService, private slack: SlackService) {}

  listByRun(runId: string) {
    return this.prisma.integrityCheck.findMany({ where: { runId }, orderBy: { createdAt: 'desc' } })
  }

  async runBasicChecks(runId: string) {
    const run = await this.prisma.jobRun.findUnique({ where: { id: runId } })
    if (!run) throw new Error('Run not found')

    const results: Array<{ type: string; result: string; details?: any }> = []

    // Check 1: metrics contains snapshotId (for EBS path)
    const snapshotId = (run.metrics as any)?.snapshotId
    results.push({
      type: 'snapshotId_present',
      result: snapshotId ? 'pass' : 'fail',
      details: { snapshotId },
    })

    // Future: checksum/restore-health etc.

    const created = await Promise.all(
      results.map((r) =>
        this.prisma.integrityCheck.create({ data: { runId, type: r.type, result: r.result, details: r.details as any } })
      )
    )
    await this.audit.log('integrity.run', 'JobRun', runId, { results })
    if (results.some(r => r.result === 'fail')) {
      await this.slack.notify(`Integrity checks failed for run ${runId}`)
    }
    return created
  }
}

