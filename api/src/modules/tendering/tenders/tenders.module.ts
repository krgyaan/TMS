import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TenderInfoController } from '@/modules/tendering/tenders/tenders.controller';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';

@Module({
    imports: [DatabaseModule, TenderStatusHistoryModule, EmailModule, TimersModule],
    controllers: [TenderInfoController],
    providers: [TenderInfosService],
    exports: [TenderInfosService],
})
export class TendersModule { }
