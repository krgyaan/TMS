import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TenderResultController } from '@/modules/tendering/tender-result/tender-result.controller';
import { TenderResultService } from '@/modules/tendering/tender-result/tender-result.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule],
    controllers: [TenderResultController],
    providers: [TenderResultService],
    exports: [TenderResultService],
})
export class TenderResultModule { }
