import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig, { validateAppEnv } from './config/app.config';
import dbConfig, { validateDbEnv } from './config/db.config';
import { DatabaseModule } from './db/database.module';
import { UsersModule } from './modules/master/users/users.module';
import { HealthModule } from './modules/master/health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesModule } from './modules/master/roles/roles.module';
import { DesignationsModule } from './modules/master/designations/designations.module';
import { TeamsModule } from './modules/master/teams/teams.module';
import { UserProfilesModule } from './modules/master/user-profiles/user-profiles.module';
import { OauthAccountsModule } from './modules/master/oauth-accounts/oauth-accounts.module';
import { TenderStatusModule } from './modules/master/tender-status/tender-status.module';

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
    TenderStatusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
