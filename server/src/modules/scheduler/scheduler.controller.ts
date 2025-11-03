import { Controller, Post, UseGuards } from '@nestjs/common'
import { SchedulerService } from './scheduler.service.js'
import { ApiKeyGuard } from '../../lib/api-key.guard.js'

@Controller('scheduler')
export class SchedulerController {
  constructor(private scheduler: SchedulerService) {}

  @Post('reload')
  @UseGuards(ApiKeyGuard)
  reload() {
    return this.scheduler.rebuildAll().then(() => ({ status: 'ok' }))
  }
}

