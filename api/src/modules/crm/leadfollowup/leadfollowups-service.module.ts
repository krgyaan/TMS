import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { EmailModule } from "@/modules/email/email.module";
import { LeadFollowupsService } from "./leadfollowups.service";

/**
 * Service-only module (no controllers).
 * Lets the BullMQ worker use `LeadFollowupsService` without instantiating
 * HTTP controllers / guards.
 */
@Module({
    imports: [DatabaseModule, EmailModule],
    providers: [LeadFollowupsService],
    exports: [LeadFollowupsService],
})
export class LeadFollowupsServiceModule {}
