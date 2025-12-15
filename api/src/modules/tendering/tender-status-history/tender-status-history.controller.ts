import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TenderStatusHistoryService } from './tender-status-history.service';
import { Public } from '@/modules/auth/decorators';

@Controller('tender-status-history')
export class TenderStatusHistoryController {
    constructor(private readonly service: TenderStatusHistoryService) { }

    @Public()
    @Get()
    async list() {
        return "Hello World";
    }

    @Public()
    @Get(':tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.service.findByTenderId(tenderId);
    }
}
