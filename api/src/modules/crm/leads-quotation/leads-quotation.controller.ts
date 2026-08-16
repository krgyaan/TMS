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
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
    @UseInterceptors(FilesInterceptor('documents', 10, {
        storage: diskStorage({
            destination: './uploads/crm/leads-quotations',
            filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = extname(file.originalname);
                callback(null, `${uniqueSuffix}${ext}`);
            },
        }),
        limits: { fileSize: 25 * 1024 * 1024 },
    }))
    @HttpCode(HttpStatus.OK)
    async uploadDocs(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const filenames = files.map(f => f.filename);
        await this.leadsQuotationService.appendQuoteDocs(id, filenames);
        return { filenames };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.leadsQuotationService.remove(id);
    }
}
