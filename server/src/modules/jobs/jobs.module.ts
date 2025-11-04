import { Module } from '@nestjs/common'
import { JobsController } from './jobs.controller.js'
import { JobsService } from './jobs.service.js'
import { PrismaService } from '../../lib/prisma.service.js'
import { AwsEbsService } from '../../lib/aws/ebs.service.js'
import { AwsRdsService } from '../../lib/aws/rds.service.js'
import { AwsS3Service } from '../../lib/aws/s3.service.js'
import { LocalBackupService } from '../../lib/local-backup.service.js'
import { AuditService } from '../../lib/audit.service.js'
import { SlackService } from '../../lib/slack.service.js'
import { NotionService } from '../../lib/notion.service.js'
import { CloudWatchService } from '../../lib/cloudwatch.service.js'

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    PrismaService,
    AwsEbsService,
    AwsRdsService,
    AwsS3Service,
    LocalBackupService,
    AuditService,
    SlackService,
    NotionService,
    CloudWatchService,
  ],
  exports: [JobsService],
})
export class JobsModule {}

