import { Controller, Get } from '@nestjs/common';
import { CostingSheetsService } from '@/modules/tendering/costing-sheets/costing-sheets.service';

@Controller('costing-sheets')
export class CostingSheetsController {
    constructor(private readonly costingSheetsService: CostingSheetsService) { }

    @Get()
    findAll() {
        return this.costingSheetsService.findAll();
    }
}
