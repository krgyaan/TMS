import { ValidatedBody } from '@/decorators/validated-body.decorator';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { CreatePrivateQuoteDto, UpdatePrivateQuoteDto } from './dto/leads-quotation.dto';
import { CreatePrivateQuoteSchema, UpdatePrivateQuoteSchema } from './dto/leads-quotation.dto';
import { LeadsQuotationService } from './leads-quotation.service';

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
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: string,
    ) {
        return this.leadsQuotationService.findAll({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search,
            status,
            enquiryId: enquiryId ? Number(enquiryId) : undefined,
            sortBy,
            sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        });
    }

    @Get('by-lead/:leadId')
    async getByLead(@Param('leadId', ParseIntPipe) leadId: number) {
        return this.leadsQuotationService.findByLeadId(leadId);
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

    @Post(':id/upload-docs')
    @HttpCode(HttpStatus.OK)
    async uploadDocs(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { filenames: string[] },
    ) {
        const filenames = Array.isArray(body?.filenames) ? body.filenames : [];
        await this.leadsQuotationService.appendQuoteDocs(id, filenames);
        return { filenames };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.leadsQuotationService.remove(id);
    }
}
