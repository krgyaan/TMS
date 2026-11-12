import { Module } from "@nestjs/common";
import { FollowUpModule } from "./follow-up.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { FollowupScheduler } from "./follow-up.scheduler";

@Module({
    imports: [FollowUpModule, QueueModule],
    providers: [FollowupScheduler],
})
export class FollowupSchedulerModule {}
