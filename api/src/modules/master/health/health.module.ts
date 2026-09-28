import { Module } from "@nestjs/common";
import { HealthController } from "@/modules/master/health/health.controller";
import { HealthService } from "@/modules/master/health/health.service";
import { AdminUsageService } from "@/modules/master/health/admin-usage.service";
import { ClaudeUsageModule } from "@/modules/master/claude-usage/claude-usage.module";
import { DatabaseModule } from "@/db/database.module";
import { QueueModule } from "@/infra/queue/queue.module";

@Module({
    imports: [DatabaseModule, QueueModule, ClaudeUsageModule],
    controllers: [HealthController],
    providers: [HealthService, AdminUsageService],
    exports: [HealthService, AdminUsageService, ClaudeUsageModule],
})
export class HealthModule {}

