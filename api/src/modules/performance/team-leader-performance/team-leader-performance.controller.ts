import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { TeamLeaderPerformanceService } from "./team-leader-performance.service";
import { PerformanceQuerySchema } from "../tender-executive-performance/zod/performance-query.dto";
import { z } from "zod";
import { CanRead } from "@/modules/auth/decorators";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { TenderListQuerySchema } from "@/modules/performance/tender-executive-performance/zod/tender.dto";

@Controller("performance/team-leader")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TeamLeaderPerformanceController {
    constructor(private readonly teamLeaderPerformanceService: TeamLeaderPerformanceService) {}

    @Get()
    healthCheck(): { message: string } {
        return { message: "Team Leader Performance API is running." };
    }

    @Get("context")
    @CanRead("performance.team-leader")
    async getContext(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getContext(parsed);
    }

    @Get("stages")
    @CanRead("performance.team-leader")
    async getStagePerformance(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getStagePerformance(parsed);
    }

    @Get("stage-matrix")
    @CanRead("performance.team-leader")
    async getStageMatrix(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getStageMatrix(parsed);
    }

    @Get("summary")
    @CanRead("performance.team-leader")
    async getSummary(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getSummary(parsed);
    }

    @Get("outcomes")
    @CanRead("performance.team-leader")
    async getOutcomes(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getOutcomes(parsed);
    }

    @Get("trends")
    @CanRead("performance.team-leader")
    async getTrends(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.extend({
            bucket: z.enum(["week", "month"]).optional(),
        }).parse(query);

        return this.teamLeaderPerformanceService.getTrends(parsed);
    }

    @Get("scoring")
    @CanRead("performance.team-leader")
    async getScoring(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getScoring(parsed);
    }

    @Get("tenders")
    @CanRead("performance.team-leader")
    async getTenderList(@Query() query: unknown) {
        const parsed = TenderListQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getTenderList(parsed);
    }
}
