import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service.js'

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(action: string, entity: string, entityId?: string, meta?: any, actor?: string) {
    return this.prisma.auditLog.create({ data: { action, entity, entityId, actor, meta } })
  }
}

