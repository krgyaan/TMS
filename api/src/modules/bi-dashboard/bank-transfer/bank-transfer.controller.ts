import { Controller, Get, Query } from '@nestjs/common';
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
    ) {
        return this.bankTransferService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.bankTransferService.getDashboardCounts();
    }
}
