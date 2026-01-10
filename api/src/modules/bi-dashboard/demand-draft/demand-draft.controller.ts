import { Controller, Get, Query } from '@nestjs/common';
import { DemandDraftService } from './demand-draft.service';

@Controller('demand-drafts')
export class DemandDraftController {
    constructor(private readonly demandDraftService: DemandDraftService) {}

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.demandDraftService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.demandDraftService.getDashboardCounts();
    }
}
