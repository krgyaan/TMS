import { Controller, Get, Put, Param, Body, ParseIntPipe, Query } from '@nestjs/common';
import { TenderApprovalService, type TenderApprovalFilters } from '@/modules/tendering/tender-approval/tender-approval.service';
import { TenderApprovalPayloadSchema, type TenderApprovalPayload } from '@/modules/tendering/tender-approval/dto/tender-approval.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TimersService } from '@/modules/timers/timers.service';
import type { TimerWithComputed } from '@/modules/timers/timer.types';
import { transformTimerForFrontend } from '@/modules/timers/timer-transform';
import { Logger } from '@nestjs/common';

@Controller('tender-approvals')
export class TenderApprovalController {
    private readonly logger = new Logger(TenderApprovalController.name);
    constructor(
        private readonly tenderApprovalService: TenderApprovalService,
        private readonly timersService: TimersService
    ) { }

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
        // Add timer data to each tender
        const dataWithTimers = await Promise.all(
            result.data.map(async (tender) => {
                let timer: TimerWithComputed | null = null;
                try {
                    timer = await this.timersService.getTimer('TENDER', tender.tenderId, 'tender_approval');
                } catch (error) {
                    this.logger.error(
                        `Failed to get timer for tender ${tender.tenderId}:`,
                        error
                    );
                }

                return {
                    ...tender,
                    timer: transformTimerForFrontend(timer, 'tender_approval')
                };
            })
        );

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
