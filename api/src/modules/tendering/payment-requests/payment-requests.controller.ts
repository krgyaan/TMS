import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, Logger } from '@nestjs/common';
import { PaymentRequestsQueryService } from './services/payment-requests.query.service';
import { PaymentRequestsCommandService } from './services/payment-requests.command.service';
import { CreatePaymentRequestSchema, UpdatePaymentRequestSchema, UpdateStatusSchema, DashboardQuerySchema, type DashboardResponse, type DashboardCounts, type DashboardTab } from './dto/payment-requests.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TimersService } from '@/modules/timers/timers.service';
import { getFrontendTimer } from '@/modules/timers/timer-helper';

@Controller('payment-requests')
export class PaymentRequestsController {
    private readonly logger = new Logger(PaymentRequestsController.name);

    constructor(
        private readonly queryService: PaymentRequestsQueryService,
        private readonly commandService: PaymentRequestsCommandService,
        private readonly timersService: TimersService
    ) {}

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
        // Add timer data to each tender
        const dataWithTimers = await Promise.all(
            result.data.map(async (tender: any) => {
                const timer = await getFrontendTimer(this.timersService, 'TENDER', tender.tenderId, 'emd_request');
                return {
                    ...tender,
                    timer
                };
            })
        );

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

    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.queryService.findById(id);
    }

    @Get(':id/with-details')
    async findByIdWithDetails(@Param('id', ParseIntPipe) id: number) {
        return this.queryService.findByIdWithTender(id);
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
}