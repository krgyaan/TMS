import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TenderStatusHistoryService } from './tender-status-history.service';

@Controller('tender-status-history')
export class TenderStatusHistoryController {
    constructor(private readonly service: TenderStatusHistoryService) {}

    @Get(':tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.service.findByTenderId(tenderId);
    }
}
