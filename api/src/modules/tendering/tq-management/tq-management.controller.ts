import { AppLogger } from '@/logger/app-logger.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TqManagementService } from '@/modules/tendering/tq-management/tq-management.service';
import { getFrontendTimersBatch } from '@/modules/timers/timer-helper';
import { TimersService } from '@/modules/timers/timers.service';
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { CreateTqReceivedDto, MarkAsNoTqDto, TqQualifiedDto, UpdateTqMissedDto, UpdateTqReceivedDto, UpdateTqRepliedDto } from './dto/tq-management.dto';

@Controller('tq-management')
export class TqManagementController {
    private readonly logger;
    constructor(
        private readonly appLogger: AppLogger,
        private readonly tqManagementService: TqManagementService,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(TqManagementController.name);
    }

    @Get('dashboard')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tabKey') tabKey?: 'awaited' | 'received' | 'replied' | 'qualified' | 'disqualified',
        @Query('tab') tab?: 'awaited' | 'received' | 'replied' | 'qualified' | 'disqualified',
        @Query('teamId') teamId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        // Use tabKey if provided, otherwise fall back to tab for backward compatibility
        const activeTab = tabKey || tab;
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        const result = await this.tqManagementService.getDashboardData(user, parseNumber(teamId), activeTab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
        // Batch-fetch timer data for all tenders
        const tenderIds = result.data.map(t => t.tenderId);
        const timerMap = await getFrontendTimersBatch(this.timersService, 'TENDER', tenderIds, 'tq_replied');
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
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.tqManagementService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.tqManagementService.findByTenderId(tenderId);
    }

    @Get(':id/items')
    getTqItems(@Param('id', ParseIntPipe) id: number) {
        return this.tqManagementService.getTqItems(id);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.tqManagementService.findById(id);
    }

    @Post('received')
    createTqReceived(
        @Body() dto: CreateTqReceivedDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.tqManagementService.createTqReceived({
            tenderId: dto.tenderId,
            tqSubmissionDeadline: new Date(dto.tqSubmissionDeadline),
            tqDocumentReceived: dto.tqDocumentReceived,
            receivedBy: user.sub,
            tqItems: dto.tqItems,
        });
    }

    @Patch(':id/replied')
    updateTqReplied(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTqRepliedDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.tqManagementService.updateTqReplied(id, {
            repliedDatetime: new Date(dto.repliedDatetime),
            repliedDocument: dto.repliedDocument,
            proofOfSubmission: dto.proofOfSubmission,
            repliedBy: user.sub,
        });
    }

    @Patch(':id/missed')
    updateTqMissed(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTqMissedDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.tqManagementService.updateTqMissed(id, dto, user.sub);
    }

    @Patch(':id/qualified')
    tqQualified(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: TqQualifiedDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.tqManagementService.tqQualified(id, user.sub, dto.qualified ?? true, dto.disqualificationReason ?? undefined);
    }

    @Post('no-tq')
    markAsNoTq(
        @Body() dto: MarkAsNoTqDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // Building the no TQ again
        // Default to qualified=true, can be extended to accept qualification status from DTO
        return this.tqManagementService.markAsNoTq(dto.tenderId, user.sub, dto.qualified ?? true, dto.disqualificationReason ?? undefined);
    }

    @Patch(':id/received')
    updateTqReceived(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTqReceivedDto
    ) {
        return this.tqManagementService.updateTqReceived(id, {
            tqSubmissionDeadline: new Date(dto.tqSubmissionDeadline),
            tqDocumentReceived: dto.tqDocumentReceived,
            tqItems: dto.tqItems,
        });
    }
}
