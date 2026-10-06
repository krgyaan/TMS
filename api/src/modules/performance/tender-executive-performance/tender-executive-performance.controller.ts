import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { TenderExecutiveService } from "./tender-executive-performance.service";
import { PerformanceQuerySchema, PerformanceQueryDto } from "./zod/performance-query.dto";
import { z } from "zod";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { DataScope } from "@/common/constants/roles.constant";
import { TenderListQuerySchema } from "./zod/tender.dto";
import { StageBacklogQuerySchema } from "./zod/stage-backlog-query.dto";
import { EmdBalanceQuerySchema } from "./zod/emd-balance-query.dto";


const UNRESTRICTED_ROLES = new Set<string>(["Coordinator"]);

/** Sentinel that matches no tender; used to return an empty set rather than a wider one. */
const NO_ACCESS_USER_ID = -1;

type ScopedQuery = {
    userId?: number | undefined;
    teamId?: number | undefined;
    view?: string | undefined;
    [key: string]: unknown;
};

function isUnrestrictedScope(user: ValidatedUser): boolean {
    return user.dataScope === DataScope.ALL || UNRESTRICTED_ROLES.has(user.role ?? "");
}


@Controller("performance/tender-executive")
@UseGuards(JwtAuthGuard)
export class TenderExecutiveController {
    constructor(private readonly tenderExecutiveService: TenderExecutiveService) {}

    private resolveTeamId = (userId: number) => this.tenderExecutiveService.resolveEffectiveTeamId(userId);

   
    private async clampToScope<T extends ScopedQuery>(user: ValidatedUser, query: T): Promise<T> {
        if (isUnrestrictedScope(user)) {
            return query;
        }

        if (user.dataScope === DataScope.SELF) {
            return { ...query, userId: user.sub, teamId: undefined, view: "user" };
        }

        // dataScope === TEAM
        if (query.view === "user" && query.userId != null) {
            const targetTeamId = await this.resolveTeamId(query.userId);
            if (targetTeamId == null || user.teamId == null || targetTeamId !== user.teamId) {
                return { ...query, userId: NO_ACCESS_USER_ID, teamId: undefined, view: "user" };
            }
            return query;
        }

        return { ...query, userId: undefined, teamId: user.teamId ?? undefined, view: "team" };
    }

    /** Same rules, for the endpoints that only accept a single userId. */
    private async clampUserIdScope(user: ValidatedUser, userId: number): Promise<number> {
        if (isUnrestrictedScope(user)) {
            return userId;
        }

        if (user.dataScope === DataScope.SELF) {
            return user.sub;
        }

        const targetTeamId = await this.resolveTeamId(userId);
        if (targetTeamId == null || user.teamId == null || targetTeamId !== user.teamId) {
            return NO_ACCESS_USER_ID;
        }
        return userId;
    }

    @Get()
    healthCheck(): string {
        return "Tender Executive Performance API is running.";
    }

    @Get("context")
    async getContext(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = PerformanceQuerySchema.parse(query);
        const userId = await this.clampUserIdScope(req.user, parsed.userId);
        return this.tenderExecutiveService.getContext({ ...parsed, userId });
    }

    @Get("stage-matrix")
    async getStageMatrix(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = PerformanceQuerySchema.parse(query);
        const userId = await this.clampUserIdScope(req.user, parsed.userId);
        return this.tenderExecutiveService.getStageMatrix({ ...parsed, userId });
    }

    @Get("stages")
    async getStagePerformance(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = PerformanceQuerySchema.parse(query);
        const userId = await this.clampUserIdScope(req.user, parsed.userId);
        console.log("Received getStagePerformance request with query:", { ...parsed, userId });
        return this.tenderExecutiveService.getStagePerformance({ ...parsed, userId });
    }

    @Get("summary")
    async getSummary(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = PerformanceQuerySchema.parse(query);
        const userId = await this.clampUserIdScope(req.user, parsed.userId);
        return this.tenderExecutiveService.getSummary({ ...parsed, userId });
    }

    @Get("outcomes")
    async getOutcomes(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = PerformanceQuerySchema.parse(query);
        const userId = await this.clampUserIdScope(req.user, parsed.userId);
        return this.tenderExecutiveService.getOutcomes({ ...parsed, userId });
    }

    @Get("tenders")
    async getTenderList(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = TenderListQuerySchema.parse(query);
        const userId = await this.clampUserIdScope(req.user, parsed.userId);
        return this.tenderExecutiveService.getTenderList({ ...parsed, userId });
    }

    @Get("trends")
    async getTrends(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = PerformanceQuerySchema.extend({
            bucket: z.enum(["week", "month"]).optional(),
        }).parse(query);
        const userId = await this.clampUserIdScope(req.user, parsed.userId);

        return this.tenderExecutiveService.getTrends({ ...parsed, userId });
    }

    @Get("scoring")
    async getScoring(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = PerformanceQuerySchema.parse(query);
        const userId = await this.clampUserIdScope(req.user, parsed.userId);
        return this.tenderExecutiveService.getScoring({ ...parsed, userId });
    }

    @Get("stage-backlog")
    async getStageBacklog(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = StageBacklogQuerySchema.parse(query);
        const scoped = await this.clampToScope(req.user, parsed);
        return this.tenderExecutiveService.getStageBacklogV2(scoped);
    }

    @Get("emd-balance")
    async getEmdBalance(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = EmdBalanceQuerySchema.parse(query);
        const scoped = await this.clampToScope(req.user, parsed);
        return this.tenderExecutiveService.getEmdBalance(scoped);
    }

    @Get("emd-cashflow")
    async getEmdCashFlow(@Query() query: unknown, @Req() req: { user: ValidatedUser }) {
        const parsed = EmdBalanceQuerySchema.parse(query);
        const scoped = await this.clampToScope(req.user, parsed);
        return this.tenderExecutiveService.getEmdCashFlow(scoped);
    }
}
