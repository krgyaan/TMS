import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    Request,
    ForbiddenException,
    Query
} from '@nestjs/common';
import { CostingApprovalsService, type CostingApprovalFilters } from '@/modules/tendering/costing-approvals/costing-approvals.service';
import { ApproveCostingDto, RejectCostingDto, UpdateApprovedCostingDto } from './dto/costing-approval.dto';

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
        @Request() req: any,
        @Query('costingStatus') costingStatus?: 'Pending' | 'Approved' | 'Rejected/Redo',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        // this.validateTeamLeader(req.user);
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

        return this.costingApprovalsService.findAllForApproval(req.user.team, filters);
    }

    @Get(':id')
    findById(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any
    ) {
        // this.validateTeamLeader(req.user);
        return this.costingApprovalsService.findById(id, req.user.team);
    }

    @Post(':id/approve')
    approve(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ApproveCostingDto,
        @Request() req: any
    ) {
        // this.validateTeamLeader(req.user);
        return this.costingApprovalsService.approve(
            id,
            req.user.team,
            req.user.id,
            dto
        );
    }

    @Post(':id/reject')
    reject(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RejectCostingDto,
        @Request() req: any
    ) {
        // this.validateTeamLeader(req.user);
        return this.costingApprovalsService.reject(
            id,
            req.user.team,
            req.user.id,
            dto.rejectionReason
        );
    }

    @Patch(':id')
    updateApproved(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateApprovedCostingDto,
        @Request() req: any
    ) {
        // this.validateTeamLeader(req.user);
        return this.costingApprovalsService.updateApproved(
            id,
            req.user.team,
            req.user.id,
            dto
        );
    }
}
