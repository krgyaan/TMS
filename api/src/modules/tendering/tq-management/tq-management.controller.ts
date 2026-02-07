import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, Logger } from '@nestjs/common';
import { TqManagementService, type TqManagementFilters, type TenderQueryStatus } from '@/modules/tendering/tq-management/tq-management.service';
import type {
    CreateTqReceivedDto,
    UpdateTqRepliedDto,
    UpdateTqMissedDto,
    MarkAsNoTqDto,
    UpdateTqReceivedDto,
    TqQualifiedDto
} from './dto/tq-management.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TimersService } from '@/modules/timers/timers.service';
import type { TimerWithComputed } from '@/modules/timers/timer.types';
import { transformTimerForFrontend } from '@/modules/timers/timer-transform';

@Controller('tq-management')
export class TqManagementController {
    private readonly logger = new Logger(TqManagementController.name);
    constructor(
        private readonly tqManagementService: TqManagementService,
        private readonly timersService: TimersService
    ) { }

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
        // Add timer data to each tender
        // COMMENTED OUT: Timer functionality temporarily disabled
        // const dataWithTimers = await Promise.all(
        //     result.data.map(async (tender) => {
        //         let timer: TimerWithComputed | null = null;
        //         try {
        //             timer = await this.timersService.getTimer('TENDER', tender.tenderId, 'tq_replied');
        //         } catch (error) {
        //             this.logger.error(
        //                 `Failed to get timer for tender ${tender.tenderId}:`,
        //                 error
        //             );
        //         }

        //         return {
        //             ...tender,
        //             timer: transformTimerForFrontend(timer, 'tq_replied')
        //         };
        //     })
        // );
        const dataWithTimers = result.data.map((tender) => {
            return {
                ...tender,
                timer: transformTimerForFrontend(null, 'tq_replied')
            };
        });

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
        return this.tqManagementService.tqQualified(id, user.sub, dto.qualified ?? true);
    }

    @Post('no-tq')
    markAsNoTq(
        @Body() dto: MarkAsNoTqDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // Default to qualified=true, can be extended to accept qualification status from DTO
        return this.tqManagementService.markAsNoTq(dto.tenderId, user.sub, dto.qualified ?? true);
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
