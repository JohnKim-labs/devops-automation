import { Module } from '@nestjs/common'
import { IntegrityService } from './integrity.service.js'
import { IntegrityController } from './integrity.controller.js'
import { PrismaService } from '../../lib/prisma.service.js'

@Module({
  controllers: [IntegrityController],
  providers: [IntegrityService, PrismaService],
})
export class IntegrityModule {}

