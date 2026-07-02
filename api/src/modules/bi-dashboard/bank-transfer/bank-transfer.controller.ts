import { Controller, Get, Query, Patch, Param, ParseIntPipe, Body, Req, BadRequestException } from '@nestjs/common';
import { BankTransferService } from './bank-transfer.service';

@Controller('bank-transfers')
export class BankTransferController {
    constructor(private readonly bankTransferService: BankTransferService) {}

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.bankTransferService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    @Get('dashboard/export')
    getExportData(
        @Query('tab') tab?: string,
        @Query('teamId') teamId?: string,
    ) {
        return this.bankTransferService.getExportData(tab, {
            teamId: teamId ? parseInt(teamId, 10) : undefined,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.bankTransferService.getDashboardCounts();
    }

    @Get('requests/:id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.bankTransferService.getById(id);
    }

    @Get('instruments/:id/action-form')
    async getActionFormData(@Param('id', ParseIntPipe) id: number) {
        return this.bankTransferService.getActionFormData(id);
    }

    @Get('instruments/:id/followup')
    async getFollowupData(@Param('id', ParseIntPipe) id: number) {
        return this.bankTransferService.getFollowupData(id);
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
        return this.bankTransferService.updateAction(id, body, req.user);
    }
}
