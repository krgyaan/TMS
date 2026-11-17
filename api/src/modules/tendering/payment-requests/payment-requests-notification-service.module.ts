import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { EmailModule } from "@/modules/email/email.module";
import { PdfGeneratorModule } from "@/modules/pdf/pdf-generator.module";
import { PaymentRequestsNotificationService } from "./services/payment-requests-notification.service";
import { DocxModule } from "@/modules/docx/docx.module";

/**
 * Service-only module (no controllers).
 * Lets the generic-mail BullMQ worker use
 * `PaymentRequestsNotificationService` without instantiating
 * `PaymentRequestsController` / HTTP guards.
 */
@Module({
    imports: [DatabaseModule, EmailModule, PdfGeneratorModule, DocxModule],
    providers: [PaymentRequestsNotificationService],
    exports: [PaymentRequestsNotificationService],
})
export class PaymentRequestsNotificationServiceModule {}
