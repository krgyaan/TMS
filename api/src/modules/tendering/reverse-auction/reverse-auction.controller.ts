import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    Query,
} from '@nestjs/common';
import { ReverseAuctionService } from '@/modules/tendering/reverse-auction/reverse-auction.service';
import { ScheduleRaDto, UploadRaResultDto } from '@/modules/tendering/reverse-auction/dto/reverse-auction.dto';
import type { RaDashboardType } from '@/modules/tendering/reverse-auction/reverse-auction.service';

@Controller('reverse-auctions')
export class ReverseAuctionController {
    constructor(private readonly reverseAuctionService: ReverseAuctionService) { }

    @Get('dashboard')
    getDashboard(@Query('type') type?: RaDashboardType) {
        return this.reverseAuctionService.getDashboardData(type);
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.reverseAuctionService.getDashboardCounts();
    }

    @Get()
    findAll() {
        return this.reverseAuctionService.findAll();
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.reverseAuctionService.findById(id);
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.reverseAuctionService.findByTenderId(tenderId);
    }

    @Post('create/:tenderId')
    createForTender(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body('bidSubmissionDate') bidSubmissionDate: string
    ) {
        return this.reverseAuctionService.createForTender(
            tenderId,
            new Date(bidSubmissionDate)
        );
    }

    @Patch(':id/schedule')
    async scheduleRa(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ScheduleRaDto
    ) {
        // Fetch RA to get tenderId
        const ra = await this.reverseAuctionService.findById(id);
        return this.reverseAuctionService.scheduleRa(id, ra.tenderId, dto);
    }

    @Patch(':id/upload-result')
    uploadResult(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UploadRaResultDto
    ) {
        return this.reverseAuctionService.uploadResult(id, dto);
    }

    @Post('update-started-status')
    updateRaStartedStatus() {
        return this.reverseAuctionService.updateRaStartedStatus();
    }
}
