import { Module } from "@nestjs/common";
import { LeadFollowupsModule } from "./leadfollowups.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { LeadFollowupScheduler } from "./lead-followup.scheduler";

@Module({
    imports: [LeadFollowupsModule, QueueModule],
    providers: [LeadFollowupScheduler],
})
export class LeadFollowupSchedulerModule {}