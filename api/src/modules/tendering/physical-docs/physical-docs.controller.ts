import { AppLogger } from '@/logger/app-logger.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { CreatePhysicalDocDto, UpdatePhysicalDocDto } from '@/modules/tendering/physical-docs/dto/physical-docs.dto';
import { PhysicalDocsService } from '@/modules/tendering/physical-docs/physical-docs.service';
import { getFrontendTimersBatch } from '@/modules/timers/timer-helper';
import { TimersService } from '@/modules/timers/timers.service';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';

@Controller('physical-docs')
export class PhysicalDocsController {
    private readonly logger;
    constructor(
        private readonly appLogger: AppLogger,
        private readonly physicalDocsService: PhysicalDocsService,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(PhysicalDocsController.name);
    }

    @Get('dashboard')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tab') tab?: 'pending' | 'sent' | 'tender-dnb',
        @Query('teamId') teamId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        const result = await this.physicalDocsService.getDashboardData(user, parseNumber(teamId), tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
        // Batch-fetch timer data for all tenders
        const tenderIds = result.data.map(t => t.tenderId);
        const timerMap = await getFrontendTimersBatch(this.timersService, 'TENDER', tenderIds, 'physical_docs');
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
    async getDashboardCounts(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.physicalDocsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get('by-tender/:tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.physicalDocsService.findByTenderIdWithPersons(tenderId);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const physicalDoc = await this.physicalDocsService.findById(id);
        if (!physicalDoc) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }
        return physicalDoc;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: CreatePhysicalDocDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.physicalDocsService.create(body, user.sub);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePhysicalDocDto) {
        return this.physicalDocsService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.physicalDocsService.delete(id);
    }
}
