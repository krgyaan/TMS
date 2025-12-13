import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { RfqsService } from '@/modules/tendering/rfqs/rfq.service';
import { RfqsController } from '@/modules/tendering/rfqs/rfq.controller';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule],
    controllers: [RfqsController],
    providers: [RfqsService],
    exports: [RfqsService],
})
export class RfqsModule { }
