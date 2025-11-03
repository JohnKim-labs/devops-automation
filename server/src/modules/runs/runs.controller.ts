import { Controller, Get, Query } from '@nestjs/common'
import { RunsService } from './runs.service.js'

@Controller('job-runs')
export class RunsController {
  constructor(private runs: RunsService) {}

  @Get()
  list(@Query('jobId') jobId?: string) {
    return this.runs.listByJob(jobId)
  }
}

