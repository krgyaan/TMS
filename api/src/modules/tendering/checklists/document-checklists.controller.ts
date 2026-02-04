import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { DocumentChecklistsService, type DocumentChecklistFilters } from '@/modules/tendering/checklists/document-checklists.service';
import type { CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/modules/tendering/checklists/dto/document-checklist.dto';
import { type TimerData, WorkflowService } from '@/modules/timers/services/workflow.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('document-checklists')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DocumentChecklistsController {
    private readonly logger = new Logger(DocumentChecklistsController.name);
    constructor(
        private readonly documentChecklistsService: DocumentChecklistsService,
        private readonly workflowService: WorkflowService
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
        const result = await this.documentChecklistsService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        }, user, parseNumber(teamId));
        // Add timer data to each tender
        const dataWithTimers = await Promise.all(
            result.data.map(async (tender) => {
                let timer: TimerData | null = null;
                try {
                    timer = await this.workflowService.getTimerForStep('TENDER', tender.tenderId, 'document_checklist');
                    if (!timer.hasTimer) {
                        timer = null;
                    }
                } catch (error) {
                    this.logger.error(
                        `Failed to get timer for tender ${tender.tenderId}:`,
                        error
                    );
                }

                return {
                    ...tender,
                    timer
                };
            })
        );

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
        return this.documentChecklistsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.documentChecklistsService.findByTenderId(tenderId);
    }

    @Post()
    create(@Body() createDocumentChecklistDto: CreateDocumentChecklistDto) {
        return this.documentChecklistsService.create(createDocumentChecklistDto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDocumentChecklistDto: UpdateDocumentChecklistDto,
    ) {
        return this.documentChecklistsService.update(id, updateDocumentChecklistDto);
    }
}
