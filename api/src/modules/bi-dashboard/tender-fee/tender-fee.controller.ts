import { Controller, Get, Query, Patch, Param, ParseIntPipe, Body, Req, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenderFeeService } from './tender-fee.service';
import { DemandDraftService } from '@/modules/bi-dashboard/demand-draft/demand-draft.service';
import { PayOnPortalService } from '@/modules/bi-dashboard/pay-on-portal/pay-on-portal.service';
import { BankTransferService } from '@/modules/bi-dashboard/bank-transfer/bank-transfer.service';

@Controller('tender-fee')
export class TenderFeeController {
    constructor(
        private readonly tenderFeeService: TenderFeeService,
        private readonly demandDraftService: DemandDraftService,
        private readonly payOnPortalService: PayOnPortalService,
        private readonly bankTransferService: BankTransferService,
    ) {}

    // ─── DD Dashboard ───

    @Get('dd/dashboard')
    getDDDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.tenderFeeService.getDDDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy, sortOrder, search,
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    @Get('dd/dashboard/counts')
    getDDDashboardCounts() {
        return this.tenderFeeService.getDDDashboardCounts();
    }

    @Get('dd/dashboard/export')
    getDDExportData(
        @Query('tab') tab?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.tenderFeeService.getDDExportData(tab, {
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    // ─── Portal Dashboard ───

    @Get('portal/dashboard')
    getPortalDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.tenderFeeService.getPortalDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy, sortOrder, search,
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    @Get('portal/dashboard/counts')
    getPortalDashboardCounts() {
        return this.tenderFeeService.getPortalDashboardCounts();
    }

    @Get('portal/dashboard/export')
    getPortalExportData(
        @Query('tab') tab?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.tenderFeeService.getPortalExportData(tab, {
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    // ─── Bank Transfer Dashboard ───

    @Get('transfer/dashboard')
    getTransferDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.tenderFeeService.getTransferDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy, sortOrder, search,
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    @Get('transfer/dashboard/counts')
    getTransferDashboardCounts() {
        return this.tenderFeeService.getTransferDashboardCounts();
    }

    @Get('transfer/dashboard/export')
    getTransferExportData(
        @Query('tab') tab?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.tenderFeeService.getTransferExportData(tab, {
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    // ─── Shared endpoints (delegate based on instrument type) ───

    @Get('requests/:id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.tenderFeeService.getById(id);
    }

    @Get('instruments/:id/action-form')
    async getActionFormData(@Param('id', ParseIntPipe) id: number) {
        const formData = await this.tenderFeeService.getActionFormData(id);
        const type = formData.instrumentType;

        if (type === 'DD') {
            return this.demandDraftService.getActionFormData(id);
        } else if (type === 'Portal Payment') {
            return this.payOnPortalService.getActionFormData(id);
        } else if (type === 'Bank Transfer') {
            return this.bankTransferService.getActionFormData(id);
        }
        throw new BadRequestException(`Unsupported instrument type: ${type}`);
    }

    @Get('instruments/:id/followup')
    async getFollowupData(@Param('id', ParseIntPipe) id: number) {
        return this.tenderFeeService.getFollowupData(id);
    }

    @Patch('instruments/:id/action')
    async updateAction(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        if (!body.action) {
            throw new BadRequestException('Action is required');
        }

        const formData = await this.tenderFeeService.getActionFormData(id);
        const type = formData.instrumentType;

        if (type === 'DD') {
            return this.demandDraftService.updateAction(id, body, req.user);
        } else if (type === 'Portal Payment') {
            return this.payOnPortalService.updateAction(id, body, req.user);
        } else if (type === 'Bank Transfer') {
            return this.bankTransferService.updateAction(id, body, req.user);
        }
        throw new BadRequestException(`Unsupported instrument type: ${type}`);
    }
}
