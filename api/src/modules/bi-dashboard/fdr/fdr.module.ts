import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FdrController } from './fdr.controller';
import { FdrService } from './fdr.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { EmailModule } from '@/modules/email/email.module';
import { EmailService } from '@/modules/email/email.service';

@Module({
    imports: [DatabaseModule, FollowUpModule, EmailModule],
    controllers: [FdrController],
    providers: [FdrService, EmailService],
    exports: [FdrService],
})
export class FdrModule {}
