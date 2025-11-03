import { Module } from '@nestjs/common'
import { HealthModule } from './health/health.module.js'
import { PrismaService } from '../lib/prisma.service.js'
import { AuditService } from '../lib/audit.service.js'
import { SlackService } from '../lib/slack.service.js'
import { JobsModule } from './jobs/jobs.module.js'
import { SchedulerModule } from './scheduler/scheduler.module.js'
import { IntegrityModule } from './integrity/integrity.module.js'
import { RunsModule } from './runs/runs.module.js'

@Module({
  imports: [HealthModule, JobsModule, SchedulerModule, IntegrityModule, RunsModule],
  providers: [PrismaService, AuditService, SlackService],
})
export class AppModule {}

