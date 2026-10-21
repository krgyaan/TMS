import { Module } from "@nestjs/common";
import { QueueModule } from "@/infra/queue/queue.module";
import { QueueMonitoringService } from "./queue-monitoring.service";
import { QueueStatsController } from "./queue-stats.controller";

@Module({
    imports: [QueueModule],
    controllers: [QueueStatsController],
    providers: [QueueMonitoringService],
    exports: [QueueMonitoringService],
})
export class QueueMonitoringModule {}
