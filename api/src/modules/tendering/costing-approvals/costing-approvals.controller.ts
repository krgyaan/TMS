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

    // private validateTeamLeader(user: any) {
    //     if (user.role !== 'Team Leader' || user.role !== 'Admin' || user.role !== 'Super Admin' || user.role !== 'Coordinator') {
    //         throw new ForbiddenException('Only team leaders can access this resource, but you are ' + user.role);
    //     }
    // }

    @Get()
    async findAll(
        @CurrentUser() user: ValidatedUser,
        @Query('costingStatus') costingStatus?: 'Submitted' | 'Approved' | 'Rejected/Redo',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        // this.validateTeamLeader(user);
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        const filters: CostingApprovalFilters = {
            ...(costingStatus && { costingStatus }),
            ...(parseNumber(page) && { page: parseNumber(page) }),
            ...(parseNumber(limit) && { limit: parseNumber(limit) }),
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
        };

        return this.costingApprovalsService.findAllForApproval((user as any).team, filters);
    }

    @Get('dashboard')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tab') tab?: 'pending' | 'approved' | 'rejected' | 'tender-dnb',
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
