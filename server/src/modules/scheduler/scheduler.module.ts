import { Module } from '@nestjs/common'
import { SchedulerService } from './scheduler.service.js'
import { SchedulerController } from './scheduler.controller.js'
import { PrismaService } from '../../lib/prisma.service.js'
import { JobsService } from '../jobs/jobs.service.js'
import { AwsEbsService } from '../../lib/aws/ebs.service.js'

@Module({
  controllers: [SchedulerController],
  providers: [SchedulerService, PrismaService, JobsService, AwsEbsService],
  exports: [SchedulerService],
})
export class SchedulerModule {}

