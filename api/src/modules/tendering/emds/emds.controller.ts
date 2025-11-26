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
    Query,
} from '@nestjs/common';
import { EmdsService } from './emds.service';
import {
    CreatePaymentRequestSchema,
    UpdatePaymentRequestSchema,
    UpdateStatusSchema,
} from './dto/emds.dto';

@Controller('emds')
export class EmdsController {
    constructor(private readonly emdsService: EmdsService) { }

    @Post('tenders/:tenderId')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body: unknown,
    ) {
        const payload = CreatePaymentRequestSchema.parse(body);
        return this.emdsService.create(tenderId, payload);
    }

    @Get()
    async findAll(@Query('status') status?: string) {
        return this.emdsService.findAllByFilters(status);
    }

    @Get('tenders/:tenderId')
    async findByTender(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.emdsService.findByTenderId(tenderId);
    }

    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.emdsService.findById(id);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const payload = UpdatePaymentRequestSchema.parse(body);
        return this.emdsService.update(id, payload);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const payload = UpdateStatusSchema.parse(body);
        return this.emdsService.updateStatus(id, payload);
    }
}
