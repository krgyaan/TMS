import { Controller, Get, Query } from "@nestjs/common";
import { TenderExecutiveService } from "./tender-executive-performance.service";
import { PerformanceQuerySchema, PerformanceQueryDto } from "./zod/performance-query.dto";
import { z } from "zod";
import { Public } from "@/modules/auth/decorators";
import { TenderListQuerySchema } from "./zod/tender.dto";
import { StageBacklogQuerySchema } from "./zod/stage-backlog-query.dto";
import { EmdBalanceQuerySchema } from "./zod/emd-balance-query.dto";

@Controller("performance/tender-executive")
export class TenderExecutiveController {
    constructor(private readonly tenderExecutiveService: TenderExecutiveService) {}

    @Get()
    healthCheck(): string {
        return "Tender Executive Performance API is running.";
    }

    @Public()
    @Get("context")
    async getContext(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.tenderExecutiveService.getContext(parsed);
    }

    @Public()
    @Get("stage-matrix")
    async getStageMatrix(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.tenderExecutiveService.getStageMatrix(parsed);
    }

    @Public()
    @Get("stages")
    async getStagePerformance(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        console.log("Received getStagePerformance request with query:", parsed);
        return this.tenderExecutiveService.getStagePerformance(parsed);
    }

    @Public()
    @Get("summary")
    async getSummary(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.tenderExecutiveService.getSummary(parsed);
    }

    @Public()
    @Get("outcomes")
    async getOutcomes(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.tenderExecutiveService.getOutcomes(parsed);
    }

    @Public()
    @Get("tenders")
    async getTenderList(@Query() query: unknown) {
        const parsed = TenderListQuerySchema.parse(query);
        return this.tenderExecutiveService.getTenderList(parsed);
    }

    @Public()
    @Get("trends")
    async getTrends(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.extend({
            bucket: z.enum(["week", "month"]).optional(),
        }).parse(query);

        return this.tenderExecutiveService.getTrends(parsed);
    }

    @Public()
    @Get("scoring")
    async getScoring(@Query() query: unknown) {
        const parsed = PerformanceQuerySchema.parse(query);
        return this.tenderExecutiveService.getScoring(parsed);
    }

    @Public()
    @Get("stage-backlog")
    async getStageBacklog(@Query() query: unknown) {
        const parsed = StageBacklogQuerySchema.parse(query);
        return this.tenderExecutiveService.getStageBacklogV2(parsed);
    }

    @Public()
    @Get("emd-balance")
    async getEmdBalance(@Query() query: unknown) {
        const parsed = EmdBalanceQuerySchema.parse(query);
        return this.tenderExecutiveService.getEmdBalance(parsed);
    }

    @Public()
    @Get("emd-cashflow")
    async getEmdCashFlow(@Query() query: unknown) {
        const parsed = EmdBalanceQuerySchema.parse(query);
        return this.tenderExecutiveService.getEmdCashFlow(parsed);
    }
}
