import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ChequeController } from './cheque.controller';
import { ChequeService } from './cheque.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { PaymentRequestsModule } from '@/modules/tendering/payment-requests/payment-requests.module';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsModule],
    controllers: [ChequeController],
    providers: [ChequeService, TenderInfosService, TenderStatusHistoryService],
    exports: [ChequeService],
})
export class ChequeModule { }
