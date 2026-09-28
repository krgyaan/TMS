import { Module } from "@nestjs/common";
import { AuthModule } from "@/modules/auth/auth.module";
import { FollowupsController, EnquiryFollowupsController } from "./leadfollowups.controller";
import { HappyCallingFollowupsController } from "./happy-calling.leadfollowups.controller";
import { LeadFollowupsServiceModule } from "./leadfollowups-service.module";

@Module({
    imports: [LeadFollowupsServiceModule, AuthModule],
    controllers: [FollowupsController, HappyCallingFollowupsController, EnquiryFollowupsController],
    exports: [LeadFollowupsServiceModule],
})
export class LeadFollowupsModule {}
