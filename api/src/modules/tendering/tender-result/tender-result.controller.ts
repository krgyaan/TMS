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
import { TenderResultService, type ResultDashboardFilters } from '@/modules/tendering/tender-result/tender-result.service';
import { UploadResultDto } from '@/modules/tendering/tender-result/dto/tender-result.dto';

@Controller('tender-results')
export class TenderResultController {
    constructor(private readonly tenderResultService: TenderResultService) { }

    @Get()
    findAll(@Query() filters?: ResultDashboardFilters) {
        return this.tenderResultService.findAll(filters);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.tenderResultService.findById(id);
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.tenderResultService.findByTenderId(tenderId);
    }

    @Get(':id/ra-details')
    getLinkedRaDetails(@Param('id', ParseIntPipe) id: number) {
        return this.tenderResultService.getLinkedRaDetails(id);
    }

    @Post('create/:tenderId')
    createForTender(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.tenderResultService.createForTender(tenderId);
    }

    @Patch(':id/upload-result')
    async uploadResult(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UploadResultDto
    ) {
        // Fetch result to get tenderId
        const result = await this.tenderResultService.findById(id);
        return this.tenderResultService.uploadResult(id, result.tenderId, dto);
    }
}
