import { AppLogger } from '@/logger/app-logger.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { CostingSheetsService } from '@/modules/tendering/costing-sheets/costing-sheets.service';
import { getFrontendTimersBatch } from '@/modules/timers/timer-helper';
import { TimersService } from '@/modules/timers/timers.service';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { CreateSheetDto, CreateSheetWithNameDto } from './dto/costing-sheet.dto';

@Controller('costing-sheets')
export class CostingSheetsController {
    private readonly logger;
    constructor(
        private readonly appLogger: AppLogger,
        private readonly costingSheetsService: CostingSheetsService,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(CostingSheetsController.name);
    }

    @Get('dashboard')
    async getDashboard(
        @Query('tab') tab?: 'pending' | 'submitted' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
        @CurrentUser() user?: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        const result = await this.costingSheetsService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        }, user, parseNumber(teamId));
        // Batch-fetch timer data for all tenders
        const tenderIds = result.data.map(t => t.tenderId);
        const timerMap = await getFrontendTimersBatch(this.timersService, 'TENDER', tenderIds, 'costing_sheet');
        const dataWithTimers = result.data.map(tender => ({
            ...tender,
            timer: timerMap.get(tender.tenderId)
        }));

        return {
            ...result,
            data: dataWithTimers
        };
    }

    @Get('dashboard/counts')
    getDashboardCounts(
        @CurrentUser() user?: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.costingSheetsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get('check-drive-scopes')
    async checkDriveScopes(@CurrentUser() user: ValidatedUser) {
        return this.costingSheetsService.checkDriveScopes(user.sub);
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.costingSheetsService.findByTenderId(tenderId);
    }

    @Get('tender/:tenderId/combined')
    getCombinedPricing(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.costingSheetsService.getCombinedPricing(tenderId);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.costingSheetsService.findById(id);
    }

    @Post()
    create(
        @Body() dto: any,
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
        @Body() dto: any,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.costingSheetsService.update(id, dto, user.sub);
    }

    @Post(':id/add-detail')
    addDetail(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: any,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.costingSheetsService.addDetail(id, dto, user.sub);
    }

    @Delete(':sheetId/details/:detailId')
    removeDetail(
        @Param('sheetId', ParseIntPipe) sheetId: number,
        @Param('detailId', ParseIntPipe) detailId: number,
    ) {
        return this.costingSheetsService.removeDetail(detailId);
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
