import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { FinanceDocumentsService } from './finance-documents.service';
import {
    CreateFinanceDocumentSchema,
    UpdateFinanceDocumentSchema,
} from './dto/finance-documents.dto';
import type {
    CreateFinanceDocumentDto,
    UpdateFinanceDocumentDto,
} from './dto/finance-documents.dto';

@Controller('finance-documents')
export class FinanceDocumentsController {
    constructor(
        private readonly financeDocumentsService: FinanceDocumentsService,
    ) { }

    @Get()
    async list(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        const filters = {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        };
        return this.financeDocumentsService.findAll(filters);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.financeDocumentsService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateFinanceDocumentSchema.parse(
            body,
        ) as CreateFinanceDocumentDto;
        return this.financeDocumentsService.create(parsed);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateFinanceDocumentSchema.parse(
            body,
        ) as UpdateFinanceDocumentDto;
        return this.financeDocumentsService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.financeDocumentsService.delete(id);
    }
}
