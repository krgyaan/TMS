import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { ChequeController } from "./cheque.controller";
import { ChequeService } from "./cheque.service";
import { FollowUpModule } from "@/modules/follow-up/follow-up.module";
import { PaymentRequestsModule } from "@/modules/tendering/payment-requests/payment-requests.module";
import { EmailModule } from "@/modules/email/email.module";
import { FileUploadModule } from "@/modules/file-upload/file-upload.module";

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsModule, EmailModule, FileUploadModule],
    controllers: [ChequeController],
    providers: [ChequeService],
    exports: [ChequeService],
})
export class ChequeModule {}
