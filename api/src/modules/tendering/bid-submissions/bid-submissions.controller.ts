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
import { SubmitBidDto, MarkAsMissedDto, UpdateBidSubmissionDto } from './dto/bid-submission.dto';
import type { BidSubmissionFilters } from './bid-submissions.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('bid-submissions')
export class BidSubmissionsController {
    constructor(private readonly bidSubmissionsService: BidSubmissionsService) { }

    @Get()
    findAll(
        @Query('bidStatus') bidStatus?: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        const filters: BidSubmissionFilters = {
            ...(bidStatus && { bidStatus }),
            ...(parseNumber(page) && { page: parseNumber(page) }),
            ...(parseNumber(limit) && { limit: parseNumber(limit) }),
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
        };

        return this.bidSubmissionsService.findAll(filters);
    }

    @Get('counts')
    getDashboardCounts() {
        return this.bidSubmissionsService.getDashboardCounts();
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
            finalBiddingPrice: dto.finalBiddingPrice,
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
            proofOfSubmission: dto.proofOfSubmission,
            finalPriceSs: dto.finalPriceSs,
            finalBiddingPrice: dto.finalBiddingPrice,
            reasonForMissing: dto.reasonForMissing,
            preventionMeasures: dto.preventionMeasures,
            tmsImprovements: dto.tmsImprovements,
        });
    }
}
