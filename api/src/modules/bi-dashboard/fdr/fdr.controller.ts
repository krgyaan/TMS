import { Controller, Get, Patch, Query, Put, Param, ParseIntPipe, Body, Req } from '@nestjs/common';
import { FdrService } from './fdr.service';

@Controller('fdrs')
export class FdrController {
    constructor(private readonly fdrService: FdrService) {}

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.fdrService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.fdrService.getDashboardCounts();
    }

    @Get('requests/:id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.fdrService.getById(id);
    }

    @Get('instruments/:id/action-form')
    async getActionFormData(@Param('id', ParseIntPipe) id: number) {
        return this.fdrService.getActionFormData(id);
    }

    @Get('instruments/:id/followup')
    async getFollowupData(@Param('id', ParseIntPipe) id: number) {
        return this.fdrService.getFollowupData(id);
    }

    @Patch('instruments/:id/action')
    async updateAction(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: Record<string, any>,
        @Req() req: any,
    ) {
        return this.fdrService.updateAction(id, body, req.user);
    }
}
