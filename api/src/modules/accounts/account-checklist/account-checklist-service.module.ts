import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { AccountChecklistService } from "./account-checklist.service";
import { MailerModule } from "@/mailer/mailer.module";
import { GoogleIntegrationModule } from "@/modules/integrations/google/google.module";
import { CoreModule } from "@/core/core.module";

/**
 * Service-only module (no controllers).
 * Imported by both the HTTP module and the BullMQ worker context
 * so workers never instantiate `AccountChecklistController`
 * (which requires `PermissionService` / HTTP guards).
 */
@Module({
    imports: [DatabaseModule, MailerModule, GoogleIntegrationModule, CoreModule],
    providers: [AccountChecklistService],
    exports: [AccountChecklistService],
})
export class AccountChecklistServiceModule {}
