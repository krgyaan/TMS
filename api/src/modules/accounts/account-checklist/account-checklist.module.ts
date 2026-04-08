// src/modules/accounts/checklist/checklist.module.ts
import { Module } from "@nestjs/common";
import { AccountChecklistController } from "./account-checklist.controller";
import { AccountChecklistService } from "./account-checklist.service";
import { MailerModule } from "@/mailer/mailer.module";
import { GoogleIntegrationModule } from "@/modules/integrations/google/google.module";
import { CoreModule } from "@/core/core.module";

@Module({
    imports: [MailerModule, GoogleIntegrationModule, CoreModule],
    controllers: [AccountChecklistController],
    providers: [AccountChecklistService],
    exports: [AccountChecklistService],
})
export class AccountChecklistModule {}