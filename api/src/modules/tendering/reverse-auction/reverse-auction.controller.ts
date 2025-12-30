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
import { ReverseAuctionService, type RaDashboardFilters } from '@/modules/tendering/reverse-auction/reverse-auction.service';
import type { ScheduleRaDto, UploadRaResultDto } from '@/modules/tendering/reverse-auction/dto/reverse-auction.dto';
import type { RaDashboardType } from '@/modules/tendering/reverse-auction/reverse-auction.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('reverse-auctions')
export class ReverseAuctionController {
    constructor(private readonly reverseAuctionService: ReverseAuctionService) { }

    @Get('dashboard')
    getDashboard(
        @Query('type') type?: RaDashboardType,
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

        const filters: RaDashboardFilters = {
            type,
            ...(parseNumber(page) && { page: parseNumber(page) }),
            ...(parseNumber(limit) && { limit: parseNumber(limit) }),
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
        };

        return this.reverseAuctionService.getDashboardData(type, filters);
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
        @Body() dto: ScheduleRaDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // Fetch RA to get tenderId
        const ra = await this.reverseAuctionService.findById(id);
        return this.reverseAuctionService.scheduleRa(id, ra.tenderId, dto, user.sub);
    }

    @Patch(':id/upload-result')
    uploadResult(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UploadRaResultDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.reverseAuctionService.uploadResult(id, dto, user.sub);
    }

    @Post('update-started-status')
    updateRaStartedStatus() {
        return this.reverseAuctionService.updateRaStartedStatus();
    }
}
