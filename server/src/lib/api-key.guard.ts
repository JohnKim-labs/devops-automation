import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const provided = req.headers['x-api-key'] as string | undefined
    const expected = process.env.ADMIN_API_KEY
    if (!expected) return true
    if (provided && provided === expected) {
      req.user = { role: 'admin' }
      return true
    }
    throw new UnauthorizedException('Invalid API key')
  }
}

