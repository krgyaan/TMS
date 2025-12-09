import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    Request
} from '@nestjs/common';
import { BidSubmissionsService } from '@/modules/tendering/bid-submissions/bid-submissions.service';
import { SubmitBidDto, MarkAsMissedDto, UpdateBidSubmissionDto } from './dto/bid-submission.dto';

@Controller('bid-submissions')
export class BidSubmissionsController {
    constructor(private readonly bidSubmissionsService: BidSubmissionsService) { }

    @Get()
    findAll() {
        return this.bidSubmissionsService.findAll();
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.bidSubmissionsService.findById(id);
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.bidSubmissionsService.findByTenderId(tenderId);
    }

    @Post('submit')
    submitBid(@Body() dto: SubmitBidDto, @Request() req: any) {
        return this.bidSubmissionsService.submitBid({
            tenderId: dto.tenderId,
            submissionDatetime: new Date(dto.submissionDatetime),
            submittedDocs: dto.submittedDocs || [],
            proofOfSubmission: dto.proofOfSubmission,
            finalPriceSs: dto.finalPriceSs,
            finalBiddingPrice: dto.finalBiddingPrice,
            submittedBy: req.user?.id || 1, // Adjust based on your auth
        });
    }

    @Post('missed')
    markAsMissed(@Body() dto: MarkAsMissedDto, @Request() req: any) {
        return this.bidSubmissionsService.markAsMissed({
            tenderId: dto.tenderId,
            reasonForMissing: dto.reasonForMissing,
            preventionMeasures: dto.preventionMeasures,
            tmsImprovements: dto.tmsImprovements,
            submittedBy: req.user?.id || 1,
        });
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
