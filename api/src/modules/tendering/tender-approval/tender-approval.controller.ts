import { AppLogger } from '@/logger/app-logger.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TenderApprovalPayloadSchema } from '@/modules/tendering/tender-approval/dto/tender-approval.dto';
import { TenderApprovalService } from '@/modules/tendering/tender-approval/tender-approval.service';
import { getFrontendTimersBatch } from '@/modules/timers/timer-helper';
import { TimersService } from '@/modules/timers/timers.service';
import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';

@Controller('tender-approvals')
export class TenderApprovalController {
    private readonly logger;
    constructor(
        private readonly appLogger: AppLogger,
        private readonly tenderApprovalService: TenderApprovalService,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(TenderApprovalController.name);
    }

    @Get('dashboard')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tabKey') tabKey: 'pending' | 'accepted' | 'rejected' | 'tender-dnb',
        @Query('teamId') teamId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        const result = await this.tenderApprovalService.getDashboardData(user, parseNumber(teamId), tabKey, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
        // Batch-fetch timer data for all tenders
        const tenderIds = result.data.map(t => t.tenderId);
        const timerMap = await getFrontendTimersBatch(this.timersService, 'TENDER', tenderIds, 'tender_approval');
        const dataWithTimers = result.data.map(tender => ({
            ...tender,
            timer: timerMap.get(tender.tenderId)
        }));

        return {
            ...result,
            data: dataWithTimers
        };
    }

    @Get('dashboard/counts')
    async getDashboardCounts(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.tenderApprovalService.getCounts(user, parseNumber(teamId));
    }

    @Get(':id/approval')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.tenderApprovalService.getByTenderId(id);
    }

    @Get('rejected-statuses')
    async getRejectStatuses(){
        return this.tenderApprovalService.getRejectionStatuses();
    }

    @Put(':tenderId/approval')
    async createOrUpdateApproval(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser
    ) {
        const data = TenderApprovalPayloadSchema.parse(body);
        return this.tenderApprovalService.updateApproval(tenderId, data, user.sub);
    }
}
