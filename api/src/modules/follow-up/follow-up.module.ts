import { Module } from "@nestjs/common";
import { AuthModule } from "@/modules/auth/auth.module";
import { FollowUpController } from "@/modules/follow-up/follow-up.controller";
import { FollowUpServiceModule } from "@/modules/follow-up/follow-up-service.module";
import { QueueModule } from "@/infra/queue/queue.module";

@Module({
    imports: [FollowUpServiceModule, QueueModule, AuthModule],
    controllers: [FollowUpController],
    exports: [FollowUpServiceModule],
})
export class FollowUpModule {}
