import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import cron from 'node-cron'
import { PrismaService } from '../../lib/prisma.service.js'
import { JobsService } from '../jobs/jobs.service.js'

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger('SchedulerService')
  private tasks = new Map<string, cron.ScheduledTask>()

  constructor(private prisma: PrismaService, private jobsService: JobsService) {}

  async onModuleInit() {
    await this.rebuildAll()
  }

  stopAll() {
    for (const task of this.tasks.values()) task.stop()
    this.tasks.clear()
  }

  async rebuildAll() {
    this.stopAll()
    const jobs = await this.prisma.backupJob.findMany({ where: { status: 'active' } })
    for (const job of jobs) {
      try {
        if (!cron.validate(job.schedule)) {
          this.logger.warn(`Invalid cron for job ${job.id}: ${job.schedule}`)
          continue
        }
        const task = cron.schedule(job.schedule, () => {
          this.logger.log(`Running job ${job.id}`)
          this.jobsService.run(job.id).catch((e) => this.logger.error(e))
        })
        this.tasks.set(job.id, task)
      } catch (e) {
        this.logger.error(`Failed to schedule job ${job.id}: ${e}`)
      }
    }
    this.logger.log(`Scheduled ${this.tasks.size} job(s)`)
  }
}

