import { Module } from '@nestjs/common'
import { JobsController } from './jobs.controller.js'
import { JobsService } from './jobs.service.js'
import { PrismaService } from '../../lib/prisma.service.js'
import { AwsEbsService } from '../../lib/aws/ebs.service.js'

@Module({
  controllers: [JobsController],
  providers: [JobsService, PrismaService, AwsEbsService],
  exports: [JobsService],
})
export class JobsModule {}

