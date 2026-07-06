import { AppLogger } from "@/logger/app-logger.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import type { CreateRfqDto, UpdateRfqDto } from "@/modules/tendering/rfqs/dto/rfq.dto";
import { RfqsService } from "@/modules/tendering/rfqs/rfq.service";
import { getFrontendTimersBatch } from "@/modules/timers/timer-helper";
import { TimersService } from "@/modules/timers/timers.service";
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";

@Controller("rfqs")
export class RfqsController {
    private readonly logger;
    constructor(
        private readonly appLogger: AppLogger,
        private readonly rfqsService: RfqsService,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(RfqsController.name);
    }

    @Get("dashboard")
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query("tab") tab?: "pending" | "sent" | "rfq-rejected" | "tender-dnb",
        @Query("teamId") teamId?: string,
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("sortBy") sortBy?: string,
        @Query("sortOrder") sortOrder?: "asc" | "desc",
        @Query("search") search?: string
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        const result = await this.rfqsService.getRfqData(user, parseNumber(teamId), tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
        // Batch-fetch timer data for all tenders
        const tenderIds = result.data.map(t => t.tenderId);
        const timerMap = await getFrontendTimersBatch(this.timersService, 'TENDER', tenderIds, 'rfq');
        const dataWithTimers = result.data.map(tender => ({
            ...tender,
            timer: timerMap.get(tender.tenderId),
        }));

        return {
            ...result,
            data: dataWithTimers,
        };
    }

    @Get("dashboard/counts")
    getDashboardCounts(@CurrentUser() user: ValidatedUser, @Query("teamId") teamId?: string) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.rfqsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get("by-tender/:tenderId")
    async getByTenderId(@Param("tenderId", ParseIntPipe) tenderId: number) {
        const rfqs = await this.rfqsService.findAllByTenderId(tenderId);
        return rfqs;
    }

    @Get("response-statuses")
    async getResponseStatuses(){
        return this.rfqsService.findResponseStatuses();
    } 

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        const rfq = await this.rfqsService.findById(id);
        if (!rfq) {
            throw new NotFoundException(`RFQ with ID ${id} not found`);
        }
        return rfq;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: CreateRfqDto, @CurrentUser() user: ValidatedUser) {
        return this.rfqsService.create(body, user.sub);
    }

    @Patch(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateRfqDto) {
        return this.rfqsService.update(id, body);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) {
        await this.rfqsService.delete(id);
    }
}
