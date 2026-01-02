import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CostingSheetsService, type CostingSheetFilters } from '@/modules/tendering/costing-sheets/costing-sheets.service';
import type { SubmitCostingSheetDto, UpdateCostingSheetDto, CreateSheetDto, CreateSheetWithNameDto } from './dto/costing-sheet.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('costing-sheets')
export class CostingSheetsController {
    constructor(private readonly costingSheetsService: CostingSheetsService) { }

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: 'pending' | 'submitted' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.costingSheetsService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.costingSheetsService.getDashboardCounts();
    }

    @Get('check-drive-scopes')
    async checkDriveScopes(@CurrentUser() user: ValidatedUser) {
        return this.costingSheetsService.checkDriveScopes(user.sub);
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

    @Post('create-sheet')
    async createGoogleSheet(
        @Body() dto: CreateSheetDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.costingSheetsService.createGoogleSheet(dto.tenderId, user.sub);
    }

    @Post('create-sheet-with-name')
    async createGoogleSheetWithName(
        @Body() dto: CreateSheetWithNameDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.costingSheetsService.createGoogleSheetWithName(
            dto.tenderId,
            user.sub,
            dto.customName,
        );
    }
}
