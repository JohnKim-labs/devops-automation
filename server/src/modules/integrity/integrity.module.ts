import { Module } from '@nestjs/common'
import { IntegrityService } from './integrity.service.js'
import { IntegrityController } from './integrity.controller.js'
import { PrismaService } from '../../lib/prisma.service.js'
import { AuditService } from '../../lib/audit.service.js'
import { SlackService } from '../../lib/slack.service.js'
import { AwsEbsService } from '../../lib/aws/ebs.service.js'
import { AwsRdsService } from '../../lib/aws/rds.service.js'
import { AwsS3Service } from '../../lib/aws/s3.service.js'

@Module({
  controllers: [IntegrityController],
  providers: [
    IntegrityService,
    PrismaService,
    AuditService,
    SlackService,
    AwsEbsService,
    AwsRdsService,
    AwsS3Service,
  ],
})
export class IntegrityModule {}

