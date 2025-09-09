import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const appCfg = config.get<{ port: number; apiPrefix: string }>('app', { infer: true });

  if (appCfg?.apiPrefix) {
    app.setGlobalPrefix(appCfg.apiPrefix);
  }

  app.enableCors({
    origin: '*',
  });

  await app.listen(appCfg?.port ?? 3000);
  console.log(`App is Running on: http://localhost:${appCfg?.port ?? 3000}`)
}
bootstrap();
