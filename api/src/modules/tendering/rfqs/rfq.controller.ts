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
    Query,
} from '@nestjs/common';
import { RfqsService, type RfqFilters } from '@/modules/tendering/rfqs/rfq.service';
import { CreateRfqDto, UpdateRfqDto } from '@/modules/tendering/rfqs/dto/rfq.dto';


@Controller('rfqs')
export class RfqsController {
    constructor(private readonly rfqsService: RfqsService) { }

    @Get()
    async list(
        @Query('rfqStatus') rfqStatus?: 'pending' | 'sent',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        return this.rfqsService.findAll({
            rfqStatus,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
        });
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
