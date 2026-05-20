import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { PaymentRequestsModule } from '@/modules/tendering/payment-requests/payment-requests.module';
import { TenderFilesService } from '@/modules/tendering/tender-files/tender-files.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { DatabaseModule } from '@db/database.module';
import { Module } from '@nestjs/common';
import { DemandDraftController } from './demand-draft.controller';
import { DemandDraftService } from './demand-draft.service';

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsModule],
    controllers: [DemandDraftController],
    providers: [DemandDraftService, TenderInfosService, TenderStatusHistoryService, TenderFilesService],
    exports: [DemandDraftService],
})
export class DemandDraftModule { }
