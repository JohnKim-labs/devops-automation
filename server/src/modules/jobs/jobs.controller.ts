import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JobsService, CreateJobInput, UpdateJobInput } from './jobs.service.js'
import { ApiKeyGuard } from '../../lib/api-key.guard.js'

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list() {
    return this.jobs.list()
  }

  @Post()
  @UseGuards(ApiKeyGuard)
  create(@Body() body: CreateJobInput) {
    return this.jobs.create(body)
  }

  @Patch(':id')
  @UseGuards(ApiKeyGuard)
  update(@Param('id') id: string, @Body() body: UpdateJobInput) {
    return this.jobs.update(id, body)
  }

  @Post(':id/run')
  @UseGuards(ApiKeyGuard)
  run(@Param('id') id: string) {
    return this.jobs.run(id)
  }
}

