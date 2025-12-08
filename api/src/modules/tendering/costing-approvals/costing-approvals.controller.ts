import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    Request,
    ForbiddenException
} from '@nestjs/common';
import { CostingApprovalsService } from '@/modules/tendering/costing-approvals/costing-approvals.service';
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
    async findAll(@Request() req: any) {
        // this.validateTeamLeader(req.user);
        let data = await this.costingApprovalsService.findAllForApproval(req.user.team);
        return data;
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
