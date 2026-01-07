import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    ForbiddenException,
    Query
} from '@nestjs/common';
import { CostingApprovalsService, type CostingApprovalFilters } from '@/modules/tendering/costing-approvals/costing-approvals.service';
import type { ApproveCostingDto, RejectCostingDto, UpdateApprovedCostingDto } from './dto/costing-approval.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('costing-approvals')
export class CostingApprovalsController {
    constructor(private readonly costingApprovalsService: CostingApprovalsService) { }

    @Get('dashboard')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tab') tab?: 'pending' | 'approved' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.costingApprovalsService.getDashboardData((user as any).team, tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    async getDashboardCounts() {
        return this.costingApprovalsService.getDashboardCounts();
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
