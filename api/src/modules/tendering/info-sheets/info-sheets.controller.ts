import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderInfoSheetPayloadSchema } from '@/modules/tendering/info-sheets/dto/info-sheet.dto';

@Controller('tender-info-sheets')
export class TenderInfoSheetsController {
    constructor(private readonly infoSheetsService: TenderInfoSheetsService) { }

    @Get(':tenderId')
    async getByTender(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.infoSheetsService.findByTenderId(tenderId);
    }

    @Post(':tenderId')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body: unknown,
    ) {
        const payload = TenderInfoSheetPayloadSchema.parse(body);
        return this.infoSheetsService.create(tenderId, payload);
    }

    @Patch(':tenderId')
    async update(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body: unknown,
    ) {
        const payload = TenderInfoSheetPayloadSchema.parse(body);
        return this.infoSheetsService.update(tenderId, payload);
    }
}
