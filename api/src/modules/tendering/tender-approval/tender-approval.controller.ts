import { Controller, Get, Put, Param, Body, ParseIntPipe, Query } from '@nestjs/common';
import { TenderApprovalService, type TenderApprovalFilters } from '@/modules/tendering/tender-approval/tender-approval.service';
import type { TenderApprovalPayload } from '@/modules/tendering/tender-approval/dto/tender-approval.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('tender-approvals')
export class TenderApprovalController {
    constructor(private readonly tenderApprovalService: TenderApprovalService) { }

    @Get('dashboard')
    async getDashboard(
        @Query('tabKey') tabKey: 'pending' | 'accepted' | 'rejected' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.tenderApprovalService.getDashboardData(tabKey, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    async getDashboardCounts() {
        return this.tenderApprovalService.getCounts();
    }

    @Get(':id/approval')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.tenderApprovalService.getByTenderId(id);
    }

    @Put(':tenderId/approval')
    async createOrUpdateApproval(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() data: TenderApprovalPayload,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.tenderApprovalService.updateApproval(tenderId, data, user.sub);
    }
}
