import { Module } from "@nestjs/common";
import { FollowUpController } from "@/modules/follow-up/follow-up.controller";
import { FollowUpServiceModule } from "@/modules/follow-up/follow-up-service.module";
import { QueueModule } from "@/infra/queue/queue.module";

@Module({
    imports: [FollowUpServiceModule, QueueModule],
    controllers: [FollowUpController],
    exports: [FollowUpServiceModule],
})
export class FollowUpModule {}
