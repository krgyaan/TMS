import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TqManagementController } from '@/modules/tendering/tq-management/tq-management.controller';
import { TqManagementService } from '@/modules/tendering/tq-management/tq-management.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule, EmailModule, TimersModule],
    controllers: [TqManagementController],
    providers: [TqManagementService],
    exports: [TqManagementService],
})
export class TqManagementModule { }
