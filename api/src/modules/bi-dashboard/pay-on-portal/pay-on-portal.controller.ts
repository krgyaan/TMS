import { Controller, Get, Query } from '@nestjs/common';
import { PayOnPortalService } from './pay-on-portal.service';

@Controller('pay-on-portals')
export class PayOnPortalController {
    constructor(private readonly payOnPortalService: PayOnPortalService) {}

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.payOnPortalService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.payOnPortalService.getDashboardCounts();
    }
}
