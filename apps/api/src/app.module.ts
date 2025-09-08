import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig, { validateAppEnv } from './config/app.config';
import dbConfig, { validateDbEnv } from './config/db.config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocsModule } from './modules/docs/docs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [appConfig, dbConfig],
      validate: (env) => ({ ...validateAppEnv(env), ...validateDbEnv(env) }),
    }),
    DatabaseModule,
    UsersModule,
    HealthModule,
    DocsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
