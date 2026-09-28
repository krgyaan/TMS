import { Module } from "@nestjs/common";
import { ClaudeUsageService } from "@/modules/master/claude-usage/claude-usage.service";
import { DatabaseModule } from "@/db/database.module";
import { QueueModule } from "@/infra/queue/queue.module";

/**
 * Standalone home for ClaudeUsageService (token usage recording + TPM tracking),
 * split out of HealthModule so feature modules that only need usage tracking
 * (bidding-requirements, PDF extraction) don't have to import the whole
 * health-check/telemetry module to reach it. HealthModule imports this module
 * for its own `/health` and `/health/claude` endpoints.
 */
@Module({
    imports: [DatabaseModule, QueueModule],
    providers: [ClaudeUsageService],
    exports: [ClaudeUsageService],
})
export class ClaudeUsageModule {}
