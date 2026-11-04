import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { FollowUpModule } from "./follow-up.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { FollowupScheduler } from "./follow-up.scheduler";

@Module({
    imports: [FollowUpModule, QueueModule],
    providers: [FollowupScheduler],
})
export class FollowupSchedulerModule {}
