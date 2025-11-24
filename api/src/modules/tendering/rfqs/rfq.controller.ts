import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { RfqsService } from './rfq.service';
import { CreateRfqDto, UpdateRfqDto } from './dto/rfq.dto';


@Controller('rfqs')
export class RfqsController {
    constructor(private readonly rfqsService: RfqsService) { }

    @Get()
    async list() {
        return this.rfqsService.findAll();
    }

    @Get('by-tender/:tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        const rfq = await this.rfqsService.findByTenderId(tenderId);
        if (!rfq) {
            throw new NotFoundException(`RFQ for Tender ID ${tenderId} not found`);
        }
        return rfq;
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const rfq = await this.rfqsService.findById(id);
        if (!rfq) {
            throw new NotFoundException(`RFQ with ID ${id} not found`);
        }
        return rfq;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: CreateRfqDto) {
        return this.rfqsService.create(body);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRfqDto) {
        return this.rfqsService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.rfqsService.delete(id);
    }
}
