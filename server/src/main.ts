import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: true, credentials: false })
  app.setGlobalPrefix('api')
  const port = process.env.PORT || 4000
  await app.listen(port)
}

bootstrap()

