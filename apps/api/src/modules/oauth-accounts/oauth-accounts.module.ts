import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OauthAccountsService } from './oauth-accounts.service';
import { OauthAccountsController } from './oauth-accounts.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [OauthAccountsController],
  providers: [OauthAccountsService],
})
export class OauthAccountsModule {}
