import { Module } from '@nestjs/common'
import { RunsService } from './runs.service.js'
import { RunsController } from './runs.controller.js'
import { PrismaService } from '../../lib/prisma.service.js'

@Module({
  controllers: [RunsController],
  providers: [RunsService, PrismaService],
  exports: [RunsService],
})
export class RunsModule {}

