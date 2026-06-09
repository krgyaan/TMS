import { Module } from "@nestjs/common";
import { FollowUpController } from "@/modules/follow-up/follow-up.controller";
import { FollowUpService } from "@/modules/follow-up/follow-up.service";
import { DatabaseModule } from "@/db/database.module";
import { MailerModule } from "@/mailer/mailer.module";
import { GoogleIntegrationModule } from "@/modules/integrations/google/google.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { CoreModule } from "@/core/core.module";
import { ClientDirectoryModule } from "@/modules/shared/client-directory/client-directory.module";

@Module({
    imports: [DatabaseModule, GoogleIntegrationModule, MailerModule, QueueModule, CoreModule, ClientDirectoryModule],
    controllers: [FollowUpController],
    providers: [FollowUpService],
    exports: [FollowUpService],
})
export class FollowUpModule {}
