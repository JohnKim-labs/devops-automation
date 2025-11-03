import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../lib/prisma.service.js'

@Injectable()
export class RunsService {
  constructor(private prisma: PrismaService) {}

  listByJob(jobId?: string) {
    return this.prisma.jobRun.findMany({
      where: jobId ? { jobId } : undefined,
      orderBy: { startedAt: 'desc' },
      take: 100,
    })
  }
}

