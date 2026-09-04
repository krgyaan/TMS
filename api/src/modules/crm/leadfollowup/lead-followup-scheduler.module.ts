import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { LeadFollowupsModule } from "./leadfollowups.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { LeadFollowupScheduler } from "./lead-followup.scheduler";

@Module({
    imports: [ScheduleModule.forRoot(), LeadFollowupsModule, QueueModule],
    providers: [LeadFollowupScheduler],
})
export class LeadFollowupSchedulerModule {}