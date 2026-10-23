import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OAuthTokenService } from './oauth-token.service';
import { OAuthTokenScheduler } from './oauth-token.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [OAuthTokenService, OAuthTokenScheduler],
  exports: [OAuthTokenService],
})
export class IntegrationsModule {}
