import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    Query,
} from '@nestjs/common';
import { TenderResultService, type ResultDashboardFilters, type ResultDashboardType } from '@/modules/tendering/tender-result/tender-result.service';
import type { UploadResultDto } from '@/modules/tendering/tender-result/dto/tender-result.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('tender-results')
export class TenderResultController {
    constructor(private readonly tenderResultService: TenderResultService) { }

    @Get()
    findAll(@Query() filters?: ResultDashboardFilters) {
        console.log('filters', filters);
        return this.tenderResultService.findAll(filters);
    }

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: 'result-awaited' | 'won' | 'lost' | 'disqualified',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        // Map tab to type for backward compatibility
        const typeMap: Record<string, ResultDashboardType> = {
            'result-awaited': 'pending',
            'won': 'won',
            'lost': 'lost',
            'disqualified': 'disqualified',
        };

        return this.tenderResultService.findAll({
            type: tab ? typeMap[tab] : undefined,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.tenderResultService.getCounts();
    }

    @Get('counts')
    getCounts() {
        console.log('getCounts');
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

    @Patch(':id/upload-result')
    async uploadResult(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UploadResultDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // Fetch result to get tenderId
        const result = await this.tenderResultService.findById(id);
        return this.tenderResultService.uploadResult(id, result.tenderId, dto, user.sub);
    }
}
