import { Module } from '@nestjs/common';
import { OAuthTokenService } from './oauth-token.service';
import { OAuthTokenScheduler } from './oauth-token.scheduler';

@Module({
  providers: [OAuthTokenService, OAuthTokenScheduler],
  exports: [OAuthTokenService],
})
export class IntegrationsModule {}
