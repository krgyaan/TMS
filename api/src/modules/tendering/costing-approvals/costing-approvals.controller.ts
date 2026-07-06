import { AppLogger } from '@/logger/app-logger.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { CostingApprovalsService } from '@/modules/tendering/costing-approvals/costing-approvals.service';
import { getFrontendTimersBatch } from '@/modules/timers/timer-helper';
import { TimersService } from '@/modules/timers/timers.service';
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { ApproveAllCostingDto, ApproveCostingDto, RejectCostingDto, UpdateApprovedCostingDto } from './dto/costing-approval.dto';

@Controller('costing-approvals')
export class CostingApprovalsController {
    private readonly logger;
    constructor(
        private readonly appLogger: AppLogger,
        private readonly costingApprovalsService: CostingApprovalsService,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(CostingApprovalsController.name);
    }

    @Get('dashboard')
    async getDashboard(
        @Query('tab') tab?: 'pending' | 'approved' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
        @CurrentUser() user?: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        const result = await this.costingApprovalsService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        }, user, parseNumber(teamId));
        // Batch-fetch timer data for all tenders
        const tenderIds = result.data.map(t => t.tenderId);
        const timerMap = await getFrontendTimersBatch(this.timersService, 'TENDER', tenderIds, 'costing_sheet_approval');
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
        @CurrentUser() user?: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.costingApprovalsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get(':id')
    findById(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: ValidatedUser
    ) {
        // this.validateTeamLeader(user);
        return this.costingApprovalsService.findById(id, (user as any).team);
    }

    @Post(':id/approve')
    approve(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ApproveCostingDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // this.validateTeamLeader(user);
        return this.costingApprovalsService.approve(
            id,
            (user as any).team,
            user.sub,
            dto
        );
    }

    @Post(':id/approve-all')
    approveAll(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ApproveAllCostingDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // this.validateTeamLeader(user);
        return this.costingApprovalsService.approveAll(
            id,
            (user as any).team,
            user.sub,
            dto
        );
    }

    @Post(':id/reject')
    reject(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RejectCostingDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // this.validateTeamLeader(user);
        return this.costingApprovalsService.reject(
            id,
            (user as any).team,
            user.sub,
            dto.rejectionReason,
            dto.detailId,
        );
    }

    @Patch(':id')
    updateApproved(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateApprovedCostingDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // this.validateTeamLeader(user);
        return this.costingApprovalsService.updateApproved(
            id,
            (user as any).team,
            user.sub,
            dto
        );
    }
}
