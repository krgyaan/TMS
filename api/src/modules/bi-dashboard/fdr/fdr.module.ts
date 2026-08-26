import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { FdrController } from "./fdr.controller";
import { FdrService } from "./fdr.service";
import { FollowUpModule } from "@/modules/follow-up/follow-up.module";
import { PaymentRequestsModule } from "@/modules/tendering/payment-requests/payment-requests.module";
import { TenderInfosService } from "@/modules/tendering/tenders/tenders.service";
import { TenderStatusHistoryService } from "@/modules/tendering/tender-status-history/tender-status-history.service";
import { EmailModule } from "@/modules/email/email.module";

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsModule, EmailModule],
    controllers: [FdrController],
    providers: [FdrService, TenderInfosService, TenderStatusHistoryService],
    exports: [FdrService],
})
export class FdrModule {}
