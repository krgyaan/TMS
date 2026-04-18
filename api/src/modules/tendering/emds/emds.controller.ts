import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, Req, Logger } from '@nestjs/common';
import { EmdsService } from '@/modules/tendering/emds/emds.service';
import { CreatePaymentRequestSchema, UpdatePaymentRequestSchema, UpdateStatusSchema, DashboardQuerySchema, type DashboardResponse, type DashboardCounts, type DashboardTab } from '@/modules/tendering/emds/dto/emds.dto';
import type { Request } from 'express';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TimersService } from '@/modules/timers/timers.service';
import { getFrontendTimer } from '@/modules/timers/timer-helper';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        email: string;
        name: string;
        // Add other user properties as needed
    };
}

@Controller('emds-tenderfees')
export class EmdsController {
    private readonly logger = new Logger(EmdsController.name);
    constructor(
        private readonly emdsService: EmdsService,
        private readonly timersService: TimersService
    ) { }

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
        const result = await this.emdsService.getDashboardData(
            parsed.tab as DashboardTab ?? 'pending',
            user,
            parseNumber(teamId),
            parsed.page && parsed.limit ? { page: parsed.page, limit: parsed.limit } : undefined,
            parsed.sortBy ? { sortBy: parsed.sortBy, sortOrder: parsed.sortOrder } : undefined,
            parsed.search
        );
        // Add timer data to each tender
        const dataWithTimers = await Promise.all(
            result.data.map(async (tender) => {
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
        return this.emdsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Post('tenders/:tenderId')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser,
    ) {
        const payload = CreatePaymentRequestSchema.parse(body);
        return this.emdsService.create(tenderId, payload, user.sub);
    }

    @Get('tenders/:tenderId')
    async findByTender(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.emdsService.findByTenderId(tenderId);
    }

    @Get('tenders/:tenderId/with-details')
    async findByTenderWithDetails(
        @Param('tenderId', ParseIntPipe) tenderId: number,
    ) {
        return this.emdsService.findByTenderIdWithTender(tenderId);
    }

    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.emdsService.findById(id);
    }

    @Get(':id/with-details')
    async findByIdWithDetails(@Param('id', ParseIntPipe) id: number) {
        return this.emdsService.findByIdWithTender(id);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const payload = UpdatePaymentRequestSchema.parse(body);
        return this.emdsService.update(id, payload);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const payload = UpdateStatusSchema.parse(body);
        return this.emdsService.updateStatus(id, payload);
    }
}
