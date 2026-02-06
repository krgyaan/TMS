import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { NewTenderInfo } from '@db/schemas/tendering/tenders.schema';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { CreateTenderSchema, UpdateTenderSchema, UpdateStatusSchema, GenerateTenderNameSchema } from './dto/tender.dto';
import { TimersService } from '@/modules/timers/timers.service';
import { transformTimerForFrontend } from '@/modules/timers/timer-transform';

@Controller('tenders')
export class TenderInfoController {
    constructor(
        private readonly tenderInfosService: TenderInfosService,
        private readonly timersService: TimersService
    ) { }

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
        return this.tenderInfosService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get()
    async list(
        @CurrentUser() user: ValidatedUser,
        @Query('statusIds') statusIds?: string,
        @Query('category') category?: string,
        @Query('unallocated') unallocated?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('teamId') teamId?: string,
        @Query('assignedTo') assignedTo?: string,
    ) {
        const toNumArray = (v?: string) =>
            (v ?? '')
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !Number.isNaN(n));

        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        const tenders = await this.tenderInfosService.findAll({
            statusIds: toNumArray(statusIds),
            category,
            unallocated: unallocated === 'true' || unallocated === '1',
            page: parseNumber(page),
            limit: parseNumber(limit),
            search,
            teamId: parseNumber(teamId),
            assignedTo: parseNumber(assignedTo),
            user,
        });

        // COMMENTED OUT: Timer functionality temporarily disabled
        // const tendersWithTimers = await Promise.all(
        //     tenders.data.map(async (tender) => {
        //         const timer = await this.timersService.getTimer('TENDER', tender.id, 'tender_info');
        //         return {
        //             ...tender,
        //             timer: transformTimerForFrontend(timer, 'tender_info')
        //         };
        //     })
        // );
        const tendersWithTimers = tenders.data.map((tender) => {
            return {
                ...tender,
                timer: transformTimerForFrontend(null, 'tender_info')
            };
        });

        return {
            ...tenders,
            data: tendersWithTimers
        };
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const tender = await this.tenderInfosService.findById(id);
        if (!tender) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }
        return tender;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser
    ) {
        const parsed = CreateTenderSchema.parse(body);
        return this.tenderInfosService.create(parsed, user.sub);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser
    ) {
        const parsed = UpdateTenderSchema.parse(body);
        return this.tenderInfosService.update(id, parsed as unknown as Partial<NewTenderInfo>, user.sub);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.tenderInfosService.delete(id);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser
    ) {
        const parsed = UpdateStatusSchema.parse(body);
        return this.tenderInfosService.updateStatus(
            id,
            parsed.status,
            user.sub,
            parsed.comment
        );
    }

    @Post('generate-name')
    async generateName(@Body() body: unknown) {
        const parsed = GenerateTenderNameSchema.parse(body);
        return this.tenderInfosService.generateTenderName(
            parsed.organization,
            parsed.item,
            parsed.location
        );
    }

    @Get(':id/timer')
    async getTenderTimer(@Param('id') id: string) {
        // COMMENTED OUT: Timer functionality temporarily disabled
        // try {
        //     const timerId = parseInt(id, 10);
        //     if (Number.isNaN(timerId)) {
        //         return {
        //             hasTimer: false,
        //             stepKey: null,
        //             stepName: null,
        //             remainingSeconds: 0,
        //             status: 'NOT_STARTED',
        //         };
        //     }

        //     const timer = await this.timersService.getTimer('TENDER', timerId, 'tender_info');

        //     const transformedTimer = transformTimerForFrontend(timer, 'tender_info');

        //     // transformedTimer is now always an object (never null)
        //     return {
        //         hasTimer: transformedTimer.status !== 'NOT_STARTED',
        //         stepKey: transformedTimer.stepName,
        //         stepName: transformedTimer.stepName,
        //         remainingSeconds: transformedTimer.remainingSeconds,
        //         status: transformedTimer.status,
        //         deadline: timer?.deadlineAt || null,
        //         allocatedHours: timer?.allocatedTimeMs ? timer.allocatedTimeMs / (1000 * 60 * 60) : null,
        //     };
        // } catch (error) {
        //     return {
        //         hasTimer: false,
        //         stepKey: null,
        //         stepName: null,
        //         remainingSeconds: 0,
        //         status: 'NOT_STARTED',
        //     };
        // }
        return {
            hasTimer: false,
            stepKey: null,
            stepName: null,
            remainingSeconds: 0,
            status: 'NOT_STARTED',
        };
    }

    @Get('timers')
    async getMultipleTenderTimers(@Query('ids') ids: string) {
        const idArray = ids.split(',').map(id => id.trim());

        const timers = await Promise.all(
            idArray.map(async id => {
                try {
                    return await this.getTenderTimer(id);
                } catch (error) {
                    return {
                        tenderId: id,
                        hasTimer: false,
                        stepKey: null,
                        stepName: null,
                        remainingSeconds: 0,
                        status: 'NOT_STARTED',
                    };
                }
            })
        );

        return timers.reduce((acc, timer) => {
            acc[timer.hasTimer ? timer.stepKey || 'no_timer' : 'no_timer'] = timer;
            return acc;
        }, {} as Record<string, any>);
    }
}
