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
        @Query('tabKey') tabKey?: 'under-evaluation' | 'scheduled' | 'completed',
        @Query('type') type?: RaDashboardType, // Legacy support
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

        // Use tabKey if provided, otherwise fall back to type for backward compatibility
        const activeTab = tabKey || (type as 'under-evaluation' | 'scheduled' | 'completed' | undefined);

        const filters = {
            ...(parseNumber(page) && { page: parseNumber(page) }),
            ...(parseNumber(limit) && { limit: parseNumber(limit) }),
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
            ...(search && { search }),
        };

        return this.reverseAuctionService.getDashboardData(activeTab, filters);
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

    @Post(':tenderId/schedule')
    async scheduleRa(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() dto: ScheduleRaDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.reverseAuctionService.scheduleRa(tenderId, dto, user.sub);
    }

    @Patch(':raId/upload-result')
    uploadResult(
        @Param('raId', ParseIntPipe) raId: number,
        @Body() dto: UploadRaResultDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.reverseAuctionService.uploadResult(raId, dto, user.sub);
    }

    @Post('update-started-status')
    updateRaStartedStatus() {
        return this.reverseAuctionService.updateRaStartedStatus();
    }
}
