import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Request } from '@nestjs/common';
import { CostingSheetsService } from '@/modules/tendering/costing-sheets/costing-sheets.service';
import { SubmitCostingSheetDto, UpdateCostingSheetDto } from './dto/costing-sheet.dto';

@Controller('costing-sheets')
export class CostingSheetsController {
    constructor(private readonly costingSheetsService: CostingSheetsService) { }

    @Get()
    findAll() {
        return this.costingSheetsService.findAll();
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.costingSheetsService.findByTenderId(tenderId);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.costingSheetsService.findById(id);
    }

    @Post()
    create(@Body() dto: SubmitCostingSheetDto, @Request() req: any) {
        return this.costingSheetsService.create({
            ...dto,
            submittedBy: req.user.id, // Assuming you have auth middleware
        });
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCostingSheetDto,
    ) {
        return this.costingSheetsService.update(id, dto);
    }
}
