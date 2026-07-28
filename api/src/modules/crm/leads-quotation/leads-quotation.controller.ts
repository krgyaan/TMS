import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    ParseIntPipe,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { LeadsQuotationService } from './leads-quotation.service';
import {
    CreatePrivateQuoteSchema,
    UpdatePrivateQuoteSchema,
} from './dto/leads-quotation.dto';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import type { CreatePrivateQuoteDto, UpdatePrivateQuoteDto } from './dto/leads-quotation.dto';

@Controller('leads-quotations')
export class LeadsQuotationController {
    constructor(private readonly leadsQuotationService: LeadsQuotationService) {}

    @Get()
    async list(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('enquiryId') enquiryId?: string,
    ) {
        return this.leadsQuotationService.findAll({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search,
            status,
            enquiryId: enquiryId ? Number(enquiryId) : undefined,
        });
    }

    @Get(':id')
    async get(@Param('id', ParseIntPipe) id: number) {
        return this.leadsQuotationService.findOne(id);
    }

    @Post()
    async create(@ValidatedBody(CreatePrivateQuoteSchema) body: CreatePrivateQuoteDto) {
        return this.leadsQuotationService.create(body);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdatePrivateQuoteSchema) body: UpdatePrivateQuoteDto,
    ) {
        return this.leadsQuotationService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.leadsQuotationService.remove(id);
    }
}
