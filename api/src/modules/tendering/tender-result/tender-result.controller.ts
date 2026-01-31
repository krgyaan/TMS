import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TenderResultService } from '@/modules/tendering/tender-result/tender-result.service';
import type { ResultDashboardType } from '@/modules/tendering/types/shared.types';
import type { UploadResultDto } from '@/modules/tendering/tender-result/dto/tender-result.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('tender-results')
export class TenderResultController {
    constructor(private readonly tenderResultService: TenderResultService) { }

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: ResultDashboardType,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.tenderResultService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.tenderResultService.getCounts();
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.tenderResultService.findByTenderId(tenderId);
    }

    @Get(':id/ra-details')
    getLinkedRaDetails(@Param('id', ParseIntPipe) id: number) {
        return this.tenderResultService.getLinkedRaDetails(id);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.tenderResultService.findById(id);
    }

    @Post('create/:tenderId')
    createForTender(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.tenderResultService.createForTender(tenderId);
    }

    @Post(':id/upload-result')
    async uploadResult(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UploadResultDto,
        @CurrentUser() user: ValidatedUser
    ) {
        const result = await this.tenderResultService.findById(id);
        return this.tenderResultService.uploadResult(id, result.tenderId, dto, user.sub);
    }
}
