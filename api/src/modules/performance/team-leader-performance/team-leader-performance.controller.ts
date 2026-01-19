import { Controller, Get, Query } from "@nestjs/common";
import { TeamLeaderPerformanceService } from "./team-leader-performance.service";
import { PerformanceQuerySchema } from "../tender-executive-performance/zod/performance-query.dto";
import { z } from "zod";
import { Public } from "@/modules/auth/decorators";
import { TenderListQuerySchema } from "@/modules/performance/tender-executive-performance/zod/tender.dto";

@Controller("performance/team-leader")
export class TeamLeaderPerformanceController {
    constructor(private readonly teamLeaderPerformanceService: TeamLeaderPerformanceService) {}

    @Get()
    healthCheck(): string {
        return "Team Leader Performance API is running.";
    }

    @Public()
    @Get("context")
    async getContext(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getContext(parsed);
    }

    @Public()
    @Get("stages")
    async getStagePerformance(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getStagePerformance(parsed);
    }

    @Public()
    @Get("stage-matrix")
    async getStageMatrix(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getStageMatrix(parsed);
    }

    @Public()
    @Get("summary")
    async getSummary(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getSummary(parsed);
    }

    @Public()
    @Get("outcomes")
    async getOutcomes(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getOutcomes(parsed);
    }

    @Public()
    @Get("trends")
    async getTrends(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.extend({
            bucket: z.enum(["week", "month"]).optional(),
        }).parse(query);

        return this.teamLeaderPerformanceService.getTrends(parsed);
    }

    @Public()
    @Get("scoring")
    async getScoring(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getScoring(parsed);
    }

    @Public()
    @Get("tenders")
    async getTenderList(@Query() query: unknown) {
        const parsed = TenderListQuerySchema.parse(query);
        return this.teamLeaderPerformanceService.getTenderList(parsed);
    }
}
