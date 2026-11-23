import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Public } from "@/modules/auth/decorators/public.decorator";
import { Roles } from "@/modules/auth/decorators/roles.decorator";
import { RolesGuard } from "@/modules/auth/guards/roles.guard";
import { RoleName } from "@/common/constants/roles.constant";
import { HealthService } from "@/modules/master/health/health.service";
import { ClaudeUsageService } from "@/modules/master/claude-usage/claude-usage.service";
import { AdminUsageService } from "@/modules/master/health/admin-usage.service";
import { TallyStatusService } from "@/modules/integrations/tally/tally-status.service";

@Controller("health")
export class HealthController {
    constructor(
        private readonly healthService: HealthService,
        private readonly claudeUsageService: ClaudeUsageService,
        private readonly adminUsageService: AdminUsageService,
        private readonly tallyStatusService: TallyStatusService,
    ) {}

    @Get()
    @Public()
    async getHealth() {
        return this.healthService.getHealth();
    }

    /**
     * TallyPrime connectivity and loaded-company status.
     * Available to every signed-in user (the global JwtAuthGuard applies).
     * Cached server-side; contains mapped messages only, never the token.
     */
    @Get("tally")
    async getTallyStatus() {
        return this.tallyStatusService.getStatus();
    }

    /**
     * Protected health check endpoint verifying VOLKS_AI_SERVICE_URL reachability.
     * Accessible strictly by Admin and Super User roles.
     * Returns only status and latency.
     */
    @Get("volksai")
    @UseGuards(RolesGuard)
    @Roles(RoleName.ADMIN, RoleName.SUPER_USER)
    async getVolksAiHealth() {
        return this.healthService.checkVolksAi();
    }

    /**
     * Protected telemetry endpoint returning detailed Claude API usage,
     * Tokens Per Minute (TPM), per-user billing metrics, and Admin API reconciliation.
     * Accessible strictly by Admin and Super User roles.
     */
    @Get("claude")
    @UseGuards(RolesGuard)
    @Roles(RoleName.ADMIN, RoleName.SUPER_USER)
    async getClaudeHealth() {
        const [telemetry, reconciliation] = await Promise.all([
            this.claudeUsageService.getClaudeTelemetry(),
            this.adminUsageService.getReconciliationReport(),
        ]);

        return {
            ...telemetry,
            reconciliation,
        };
    }

    /**
     * Protected endpoint returning per-tender token and cost breakdown,
     * sortable by cost or tokens, with expandable stage calls underneath.
     * Accessible strictly by Admin and Super User roles.
     */
    @Get("claude/tenders")
    @UseGuards(RolesGuard)
    @Roles(RoleName.ADMIN, RoleName.SUPER_USER)
    async getClaudeTenders(@Query("sortBy") sortBy?: "cost" | "tokens" | "recent") {
        return this.claudeUsageService.getTendersBreakdown(sortBy);
    }
}

