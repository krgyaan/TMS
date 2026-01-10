import { Controller, Get, Query } from '@nestjs/common';
import { BankGuaranteeService } from './bank-guarantee.service';

@Controller('bank-guarantees')
export class BankGuaranteeController {
    constructor(private readonly bankGuaranteeService: BankGuaranteeService) {}

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

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.bankGuaranteeService.getDashboardCounts();
    }
}
