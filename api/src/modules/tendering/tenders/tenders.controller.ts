import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { NewTenderInfo } from '@db/schemas/tendering/tenders.schema';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { CreateTenderSchema, UpdateTenderSchema, UpdateStatusSchema, GenerateTenderNameSchema } from './dto/tender.dto';
import { type TimerData, WorkflowService } from '@/modules/timers/services/workflow.service';

@Controller('tenders')
export class TenderInfoController {
    constructor(
        private readonly tenderInfosService: TenderInfosService,
        private readonly workflowService: WorkflowService
    ) { }

    @Get('dashboard/counts')
    async getDashboardCounts() {
        return this.tenderInfosService.getDashboardCounts();
    }

    @Get()
    async list(
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
        });

        const tendersWithTimers = await Promise.all(
            tenders.data.map(async (tender) => {
                let timer: TimerData | null = null;
                timer = await this.workflowService.getTimerForStep('TENDER', tender.id, 'tender_info');
                if (!timer.hasTimer) {
                    timer = null;
                }

                return {
                    ...tender,
                    timer
                };
            })
        );

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
        try {
            const workflowStatus = await this.workflowService.getWorkflowStatus('TENDER', id);
            const currentStep = workflowStatus.steps.find(step => step.status === 'IN_PROGRESS');

            if (!currentStep || !currentStep.timerState) {
                return {
                    hasTimer: false,
                    stepKey: null,
                    stepName: null,
                    remainingSeconds: 0,
                    status: 'NOT_STARTED',
                };
            }

            const timerState = currentStep.timerState;
            const remainingSeconds = timerState.remainingMs ? Math.floor(timerState.remainingMs / 1000) : 0;

            return {
                hasTimer: true,
                stepKey: timerState.stepKey,
                stepName: timerState.stepName,
                remainingSeconds,
                status: timerState.timerStatus,
                deadline: timerState.scheduledEndAt,
                allocatedHours: timerState.totalAllocatedMs ? timerState.totalAllocatedMs / (1000 * 60 * 60) : null,
            };
        } catch (error) {
            return {
                hasTimer: false,
                stepKey: null,
                stepName: null,
                remainingSeconds: 0,
                status: 'NOT_STARTED',
            };
        }
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
            acc[timer.stepKey] = timer;
            return acc;
        }, {} as Record<string, any>);
    }
}
