import { Controller, Get, Param, Post } from '@nestjs/common'
import { IntegrityService } from './integrity.service.js'

@Controller('integrity')
export class IntegrityController {
  constructor(private integrity: IntegrityService) {}

  @Get(':runId')
  list(@Param('runId') runId: string) {
    return this.integrity.listByRun(runId)
  }

  @Post(':runId/run')
  run(@Param('runId') runId: string) {
    return this.integrity.runBasicChecks(runId)
  }
}

