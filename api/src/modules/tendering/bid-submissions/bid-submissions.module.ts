import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BidSubmissionsController } from '@/modules/tendering/bid-submissions/bid-submissions.controller';
import { BidSubmissionsService } from '@/modules/tendering/bid-submissions/bid-submissions.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule, EmailModule, TimersModule],
    controllers: [BidSubmissionsController],
    providers: [BidSubmissionsService],
    exports: [BidSubmissionsService],
})
export class BidSubmissionsModule { }
