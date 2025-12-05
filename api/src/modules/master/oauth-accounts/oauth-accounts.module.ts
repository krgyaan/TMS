import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { OauthAccountsService } from '@/modules/master/oauth-accounts/oauth-accounts.service';
import { OauthAccountsController } from '@/modules/master/oauth-accounts/oauth-accounts.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [OauthAccountsController],
  providers: [OauthAccountsService],
})
export class OauthAccountsModule {}
