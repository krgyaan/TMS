import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "./email.service";
import { GmailClient } from "./gmail.client";
import { RecipientResolver } from "./recipient.resolver";
import { FileUploadModule } from "@/modules/file-upload/file-upload.module";
import { IntegrationsModule } from "@/modules/integrations/integrations.module";

@Module({
    imports: [ConfigModule, FileUploadModule, IntegrationsModule],
    providers: [EmailService, GmailClient, RecipientResolver],
    exports: [EmailService, RecipientResolver, GmailClient],
})
export class EmailModule {}
