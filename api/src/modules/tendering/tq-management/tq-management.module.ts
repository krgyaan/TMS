import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TqManagementController } from '@/modules/tendering/tq-management/tq-management.controller';
import { TqManagementService } from '@/modules/tendering/tq-management/tq-management.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule],
    controllers: [TqManagementController],
    providers: [TqManagementService],
    exports: [TqManagementService],
})
export class TqManagementModule { }
