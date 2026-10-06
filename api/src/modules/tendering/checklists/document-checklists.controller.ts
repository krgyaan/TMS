import { AppLogger } from '@/logger/app-logger.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { BiddingRequirementsService } from '@/modules/tendering/checklists/bidding-requirements.service';
import { DocumentChecklistsService } from '@/modules/tendering/checklists/document-checklists.service';
import type { CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/modules/tendering/checklists/dto/document-checklist.dto';
import { getFrontendTimersBatch } from '@/modules/timers/timer-helper';
import { TimersService } from '@/modules/timers/timers.service';
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, StreamableFile, UsePipes, ValidationPipe } from '@nestjs/common';

@Controller('document-checklists')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DocumentChecklistsController {
    private readonly logger;
    constructor(
        private readonly appLogger: AppLogger,
        private readonly documentChecklistsService: DocumentChecklistsService,
        private readonly biddingRequirementsService: BiddingRequirementsService,
        private readonly timersService: TimersService
    ) {
        this.logger = this.appLogger.withContext(DocumentChecklistsController.name);
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
        const result = await this.documentChecklistsService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        }, user, parseNumber(teamId));
        // Batch-fetch timer data for all tenders
        const tenderIds = result.data.map(t => t.tenderId);
        const timerMap = await getFrontendTimersBatch(this.timersService, 'TENDER', tenderIds, 'document_checklist');
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
        return this.documentChecklistsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.documentChecklistsService.findByTenderId(tenderId);
    }

    /**
     * AI-suggested bidding requirements for this tender, sourced from the
     * tender's main + ATC documents via VolksAI's /analyze-bidding-requirements.
     * Caches result in tender_extractions.fields under 'biddingRequirementsAnalysis'.
     * Pass forceRefresh=true to bypass cache and re-analyze.
     */
    /**
     * Downloads ONE annexure (by its index in the cached bidding-requirements analysis) as
     * a .docx, rendered on demand by VolksAI's deterministic /generate-annexure-docx from the
     * stored blocks -- no tender re-read, no Claude call. 404 if no current analysis exists.
     */
    @Get('tender/:tenderId/annexures/:annexureIndex/download')
    downloadAnnexure(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Param('annexureIndex', ParseIntPipe) annexureIndex: number,
    ): Promise<StreamableFile> {
        return this.biddingRequirementsService.downloadAnnexureDocx(tenderId, annexureIndex);
    }

    /**
     * Cache-only read of the bidding-requirements analysis: `{ analysis }`, where analysis is
     * null when no current cached result exists. Never calls VolksAI -- used on page load so
     * an earlier analysis is visible without starting a new (paid) one.
     */
    @Get('tender/:tenderId/bidding-requirements/cached')
    async getCachedBiddingRequirements(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return { analysis: await this.biddingRequirementsService.getCachedAnalysis(tenderId) };
    }

    /**
     * Starts an asynchronous AI analysis job for bidding requirements (POST).
     * Returns immediately with job status without waiting for the slow LLM call.
     * Idempotent on (tender, document_hash).
     */
    @Post('tender/:tenderId/bidding-requirements')
    startBiddingRequirementsAnalysis(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body?: { forceRefresh?: boolean },
        @Query('forceRefresh') forceRefreshQuery?: string,
        @CurrentUser() user?: ValidatedUser,
    ) {
        const isForceRefresh =
            body?.forceRefresh === true ||
            forceRefreshQuery === 'true' ||
            forceRefreshQuery === '1';
        return this.biddingRequirementsService.startOrGetAnalysis(tenderId, isForceRefresh, user?.id);
    }

    /**
     * Pollable status endpoint for bidding requirements analysis job.
     * Returns { jobId, tenderId, status: 'pending'|'running'|'done'|'failed', analysis, error }.
     */
    @Get('tender/:tenderId/bidding-requirements/status')
    getBiddingRequirementsStatus(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.biddingRequirementsService.getJobStatus(tenderId);
    }

    /**
     * Alias for status check (or backward-compatible read).
     */
    @Get('tender/:tenderId/bidding-requirements')
    analyzeBiddingRequirementsStatus(
        @Param('tenderId', ParseIntPipe) tenderId: number,
    ) {
        return this.biddingRequirementsService.getJobStatus(tenderId);
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
