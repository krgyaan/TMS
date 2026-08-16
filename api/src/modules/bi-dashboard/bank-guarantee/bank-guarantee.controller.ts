import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Put, Query, Req } from '@nestjs/common';
import { BankGuaranteeService } from './bank-guarantee.service';

@Controller('bank-guarantees')
export class BankGuaranteeController {
    constructor(private readonly bankGuaranteeService: BankGuaranteeService) { }

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.bankGuaranteeService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/export')
    getExportData(
        @Query('tab') tab?: string,
    ) {
        return this.bankGuaranteeService.getExportData(tab);
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.bankGuaranteeService.getDashboardCounts();
    }

    @Get('dashboard/card-stats')
    getDashboardCardStats() {
        return this.bankGuaranteeService.getDashboardCardStats();
    }

    @Get('requests/:id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.bankGuaranteeService.getById(id);
    }

    @Get('instruments/:id/action-form')
    async getActionFormData(@Param('id', ParseIntPipe) id: number) {
        return this.bankGuaranteeService.getActionFormData(id);
    }

    @Get('instruments/:id/followup')
    async getFollowupData(@Param('id', ParseIntPipe) id: number) {
        return this.bankGuaranteeService.getFollowupData(id);
    }

    @Put(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        return this.bankGuaranteeService.update(id, body, [], req.user);
    }

    @Put('instruments/:id/action')
    async updateAction(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        if (!body.action) {
            throw new BadRequestException('Action is required');
        }
        return this.bankGuaranteeService.updateAction(id, body, [], req.user);
    }
}
