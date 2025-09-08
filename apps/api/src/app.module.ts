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
import { RolesModule } from './modules/roles/roles.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { TeamsModule } from './modules/teams/teams.module';
import { UserProfilesModule } from './modules/user-profiles/user-profiles.module';
import { OauthAccountsModule } from './modules/oauth-accounts/oauth-accounts.module';

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
    RolesModule,
    DesignationsModule,
    TeamsModule,
    UserProfilesModule,
    OauthAccountsModule,
    HealthModule,
    DocsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
