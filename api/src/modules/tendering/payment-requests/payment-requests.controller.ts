import { AppLogger } from '@/logger/app-logger.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { getFrontendTimersBatch } from '@/modules/timers/timer-helper';
import { TimersService } from '@/modules/timers/timers.service';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { CreateMomRemarkSchema } from './dto/payment-mom.dto';
import { CreatePaymentRequestSchema, DashboardQuerySchema, UpdatePaymentRequestSchema, UpdateStatusSchema, type DashboardCounts, type DashboardResponse, type DashboardTab } from './dto/payment-requests.dto';
import { PaymentRequestsCommandService } from './services/payment-requests.command.service';
import { PaymentRequestsQueryService } from './services/payment-requests.query.service';

@Controller('payment-requests')
export class PaymentRequestsController {
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        private readonly queryService: PaymentRequestsQueryService,
        private readonly commandService: PaymentRequestsCommandService,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(PaymentRequestsController.name);
    }

    @Get('/')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query() query: unknown,
        @Query('teamId') teamId?: string,
    ): Promise<DashboardResponse> {
        const parsed = DashboardQuerySchema.parse(query);
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        const result = await this.queryService.getDashboardData(
            parsed.tab as DashboardTab ?? 'pending',
            user,
            parseNumber(teamId),
            parsed.page && parsed.limit ? { page: parsed.page, limit: parsed.limit } : undefined,
            parsed.sortBy ? { sortBy: parsed.sortBy, sortOrder: parsed.sortOrder } : undefined,
            parsed.search
        );
        // Batch-fetch timer data for all tenders
        const tenderIds = result.data.map((t: any) => t.tenderId);
        const timerMap = await getFrontendTimersBatch(this.timersService, 'TENDER', tenderIds, 'emd_requested');
        const dataWithTimers = result.data.map((tender: any) => ({
            ...tender,
            timer: timerMap.get(tender.tenderId)
        }));

        return {
            ...result,
            data: dataWithTimers
        };
    }

    @Get('/dashboard/counts')
    async getDashboardCounts(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ): Promise<DashboardCounts> {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.queryService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Post('tenders/:tenderId')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser,
    ) {
        const payload = CreatePaymentRequestSchema.parse(body);
        console.log("payload accepted in api call: ", payload)
        return this.commandService.create(tenderId, payload, user.sub);
    }

    @Get('tenders/:tenderId')
    async findByTender(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.queryService.findByTenderId(tenderId);
    }

    @Get('tenders/:tenderId/with-details')
    async findByTenderWithDetails(
        @Param('tenderId', ParseIntPipe) tenderId: number,
    ) {
        return this.queryService.findByTenderIdWithTender(tenderId);
    }

    @Get('mom/today')
    async getTodayMomRemarks() {
        return this.queryService.getTodayRemarks();
    }

    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.queryService.findById(id);
    }

    @Get(':id/with-details')
    async findByIdWithDetails(@Param('id', ParseIntPipe) id: number) {
        return this.queryService.findByIdWithTender(id);
    }

    @Get(':id/edit')
    async findByIdForEdit(@Param('id', ParseIntPipe) id: number) {
        return this.queryService.findByIdForEdit(id);
    }

    @Post(':requestId/mom')
    @HttpCode(HttpStatus.CREATED)
    async addMomRemark(
        @Param('requestId', ParseIntPipe) requestId: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser,
    ) {
        const payload = CreateMomRemarkSchema.parse(body);
        return this.commandService.createRemark(requestId, payload, user);
    }

    @Get(':requestId/mom')
    async getMomRemarksByRequest(@Param('requestId', ParseIntPipe) requestId: number) {
        return this.queryService.getRemarksByRequestId(requestId);
    }

    @Get(':requestId/mom/instruments/:instrumentId')
    async getMomRemarksByInstrument(
        @Param('requestId', ParseIntPipe) requestId: number,
        @Param('instrumentId', ParseIntPipe) instrumentId: number,
    ) {
        return this.queryService.getRemarksByInstrumentId(instrumentId);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const payload = UpdatePaymentRequestSchema.parse(body);
        return this.commandService.update(id, payload);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const payload = UpdateStatusSchema.parse(body);
        return this.commandService.updateStatus(id, payload);
    }

    @Get(':id/instruments')
    async findInstrumentsByPaymentRequestId(@Param('id', ParseIntPipe) id: number) {
        return this.queryService.findInstrumentsByPaymentRequestId(id);
    }

    @Patch('instruments/:instrumentId/consent')
    async updateConsentForPay(
        @Param('instrumentId', ParseIntPipe) instrumentId: number,
        @Body() body: { consentRemark: string },
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.commandService.updateConsentForPay(instrumentId, body.consentRemark, user);
    }

    @Get('instruments/:id/pdf')
    async serveInstrumentPdf(
        @Param('id', ParseIntPipe) id: number,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        return this.queryService.serveGeneratedPdf(id);
    }
}