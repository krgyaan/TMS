import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    ForbiddenException,
    Query,
    Logger
} from '@nestjs/common';
import { CostingApprovalsService, type CostingApprovalFilters } from '@/modules/tendering/costing-approvals/costing-approvals.service';
import type { ApproveCostingDto, RejectCostingDto, UpdateApprovedCostingDto } from './dto/costing-approval.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { type TimerData, WorkflowService } from '@/modules/timers/services/workflow.service';

@Controller('costing-approvals')
export class CostingApprovalsController {
    private readonly logger = new Logger(CostingApprovalsController.name);
    constructor(
        private readonly costingApprovalsService: CostingApprovalsService,
        private readonly workflowService: WorkflowService
    ) { }

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
        // Add timer data to each tender
        const dataWithTimers = await Promise.all(
            result.data.map(async (tender) => {
                let timer: TimerData | null = null;
                try {
                    timer = await this.workflowService.getTimerForStep('TENDER', tender.tenderId, 'costing_approval');
                    if (!timer.hasTimer) {
                        timer = null;
                    }
                } catch (error) {
                    this.logger.error(
                        `Failed to get timer for tender ${tender.tenderId}:`,
                        error
                    );
                }

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
            dto.rejectionReason
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
