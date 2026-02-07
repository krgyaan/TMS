import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, Logger } from '@nestjs/common';
import { CostingSheetsService, type CostingSheetFilters } from '@/modules/tendering/costing-sheets/costing-sheets.service';
import type { SubmitCostingSheetDto, UpdateCostingSheetDto, CreateSheetDto, CreateSheetWithNameDto } from './dto/costing-sheet.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TimersService } from '@/modules/timers/timers.service';
import type { TimerWithComputed } from '@/modules/timers/timer.types';
import { transformTimerForFrontend } from '@/modules/timers/timer-transform';

@Controller('costing-sheets')
export class CostingSheetsController {
    private readonly logger = new Logger(CostingSheetsController.name);
    constructor(
        private readonly costingSheetsService: CostingSheetsService,
        private readonly timersService: TimersService
    ) { }

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
        // Add timer data to each tender
        // COMMENTED OUT: Timer functionality temporarily disabled
        // const dataWithTimers = await Promise.all(
        //     result.data.map(async (tender) => {
        //         let timer: TimerWithComputed | null = null;
        //         try {
        //             timer = await this.timersService.getTimer('TENDER', tender.tenderId, 'costing_sheets');
        //         } catch (error) {
        //             this.logger.error(
        //                 `Failed to get timer for tender ${tender.tenderId}:`,
        //                 error
        //             );
        //         }

        //         return {
        //             ...tender,
        //             timer: transformTimerForFrontend(timer, 'costing_sheets')
        //         };
        //     })
        // );
        const dataWithTimers = result.data.map((tender) => {
            return {
                ...tender,
                timer: transformTimerForFrontend(null, 'costing_sheets')
            };
        });

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
