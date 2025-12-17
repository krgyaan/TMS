import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CostingSheetsService, type CostingSheetFilters } from '@/modules/tendering/costing-sheets/costing-sheets.service';
import { SubmitCostingSheetDto, UpdateCostingSheetDto } from './dto/costing-sheet.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('costing-sheets')
export class CostingSheetsController {
    constructor(private readonly costingSheetsService: CostingSheetsService) { }

    @Get()
    findAll(
        @Query('costingStatus') costingStatus?: 'pending' | 'submitted' | 'rejected',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        const filters: CostingSheetFilters = {
            ...(costingStatus && { costingStatus }),
            ...(parseNumber(page) && { page: parseNumber(page) }),
            ...(parseNumber(limit) && { limit: parseNumber(limit) }),
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
        };

        return this.costingSheetsService.findAll(filters);
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.costingSheetsService.findByTenderId(tenderId);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.costingSheetsService.findById(id);
    }

    @Post()
    create(
        @Body() dto: SubmitCostingSheetDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.costingSheetsService.create({
            ...dto,
            submittedBy: user.sub,
        });
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCostingSheetDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.costingSheetsService.update(id, dto, user.sub);
    }

    @Get('counts')
    getCounts() {
        console.log('getCounts');
        return this.costingSheetsService.getDashboardCounts();
    }
}
