import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    Query
} from '@nestjs/common';
import { BidSubmissionsService } from '@/modules/tendering/bid-submissions/bid-submissions.service';
import type { SubmitBidDto, MarkAsMissedDto, UpdateBidSubmissionDto } from './dto/bid-submission.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TimersService } from '@/modules/timers/timers.service';
import { getFrontendTimer } from '@/modules/timers/timer-helper';
import { Logger } from '@nestjs/common';

@Controller('bid-submissions')
export class BidSubmissionsController {
    private readonly logger = new Logger(BidSubmissionsController.name);
    constructor(
        private readonly bidSubmissionsService: BidSubmissionsService,
        private readonly timersService: TimersService
    ) { }

    @Get('dashboard')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tab') tab?: 'pending' | 'submitted' | 'disqualified' | 'tender-dnb',
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
        const result = await this.bidSubmissionsService.getDashboardData(user, parseNumber(teamId), tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
        // Add timer data to each tender
        const dataWithTimers = await Promise.all(
            result.data.map(async (tender) => {
                this.logger.debug(`Fetching timer for tender ${tender.tenderId}, stage bid_submission`);
                const timer = await getFrontendTimer(this.timersService, 'TENDER', tender.tenderId, 'bid_submission');
                this.logger.debug(`Timer for tender ${tender.tenderId}: ${JSON.stringify(timer)}`);

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
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.bidSubmissionsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.bidSubmissionsService.findByTenderId(tenderId);
    }

    @Post('submit')
    submitBid(
        @Body() dto: SubmitBidDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.bidSubmissionsService.submitBid({
            tenderId: dto.tenderId,
            submissionDatetime: new Date(dto.submissionDatetime),
            submittedDocs: dto.submittedDocs || [],
            proofOfSubmission: dto.proofOfSubmission,
            finalPriceSs: dto.finalPriceSs,
            finalBiddingPrice: dto.finalBiddingPrice !== null && dto.finalBiddingPrice !== undefined ? String(dto.finalBiddingPrice) : null,
            submittedBy: user.sub,
        });
    }

    @Post('missed')
    markAsMissed(
        @Body() dto: MarkAsMissedDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.bidSubmissionsService.markAsMissed({
            tenderId: dto.tenderId,
            reasonForMissing: dto.reasonForMissing,
            preventionMeasures: dto.preventionMeasures,
            tmsImprovements: dto.tmsImprovements,
            submittedBy: user.sub,
        });
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.bidSubmissionsService.findById(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBidSubmissionDto
    ) {
        return this.bidSubmissionsService.update(id, {
            submissionDatetime: dto.submissionDatetime ? new Date(dto.submissionDatetime) : undefined,
            submittedDocs: dto.submittedDocs,
            proofOfSubmission: dto.proofOfSubmission ?? undefined,
            finalPriceSs: dto.finalPriceSs ?? undefined,
            finalBiddingPrice: dto.finalBiddingPrice !== null && dto.finalBiddingPrice !== undefined ? String(dto.finalBiddingPrice) : null,
            reasonForMissing: dto.reasonForMissing ?? undefined,
            preventionMeasures: dto.preventionMeasures ?? undefined,
            tmsImprovements: dto.tmsImprovements ?? undefined,
        });
    }
}
