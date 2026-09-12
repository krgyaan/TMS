import { FollowUpModule } from "@/modules/follow-up/follow-up.module";
import { PaymentRequestsModule } from "@/modules/tendering/payment-requests/payment-requests.module";
import { DatabaseModule } from "@db/database.module";
import { Module } from "@nestjs/common";
import { DemandDraftController } from "./demand-draft.controller";
import { DemandDraftService } from "./demand-draft.service";
import { EmailModule } from "@/modules/email/email.module";

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsModule, EmailModule],
    controllers: [DemandDraftController],
    providers: [DemandDraftService],
    exports: [DemandDraftService],
})
export class DemandDraftModule {}
