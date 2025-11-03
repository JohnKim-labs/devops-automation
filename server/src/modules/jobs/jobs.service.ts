import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../lib/prisma.service.js'
import { AwsEbsService } from '../../lib/aws/ebs.service.js'
import { AuditService } from '../../lib/audit.service.js'
import { SlackService } from '../../lib/slack.service.js'

export type CreateJobInput = {
  resourceType: string
  resourceId: string
  schedule: string
  status?: string
}

export type UpdateJobInput = Partial<CreateJobInput>

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService, private ebs: AwsEbsService, private audit: AuditService, private slack: SlackService) {}

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

    const run = await this.prisma.jobRun.create({
      data: { jobId: job.id, status: 'pending' },
    })

    try {
      let result: any = null
      if (job.resourceType === 'EBS') {
        result = await this.ebs.createSnapshot(job.resourceId, `Job ${job.id}`)
      } else {
        throw new Error(`Unsupported resourceType: ${job.resourceType}`)
      }

      const metrics = { snapshotId: result?.SnapshotId || result?.Snapshot?.SnapshotId }
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: { status: 'success', endedAt: new Date(), metrics },
      })
      await this.audit.log('job.run.success', 'JobRun', run.id, { jobId: job.id, metrics })
      return { runId: run.id, status: 'success', metrics }
    } catch (err: any) {
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: { status: 'failed', endedAt: new Date(), error: String(err?.message || err) },
      })
      await this.audit.log('job.run.failed', 'JobRun', run.id, { jobId: job.id, error: String(err?.message || err) })
      await this.slack.notify(`Job ${job.id} failed: ${String(err?.message || err)}`)
      throw err
    }
  }
}

