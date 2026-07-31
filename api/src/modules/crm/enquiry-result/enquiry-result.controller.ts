import { Controller, Get, Post, Patch, Delete, Param, ParseIntPipe, Query, Req, UseInterceptors, UploadedFiles, HttpCode, HttpStatus } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import { EnquiryResultService } from './enquiry-result.service';
import {
    CreateEnquiryResultSchema,
    UpdateEnquiryResultSchema,
    EnquiryResultListSchema,
    CreateFollowupSchema,
    type CreateEnquiryResultDto,
    type UpdateEnquiryResultDto,
    type EnquiryResultListDto,
    type CreateFollowupDto,
} from './dto/enquiry-result.dto';

@Controller('enquiry-results')
export class EnquiryResultController {
    constructor(private readonly service: EnquiryResultService) {}

    onModuleInit() {
        mkdirSync(join(process.cwd(), 'uploads', 'enquiry-results'), { recursive: true });
    }

    @Get()
    async findAll(@Query() filters: EnquiryResultListDto) {
        const parsed = EnquiryResultListSchema.parse(filters);
        return this.service.findAll(parsed);
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Post()
    async create(@ValidatedBody(CreateEnquiryResultSchema) body: CreateEnquiryResultDto) {
        return this.service.create(body);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateEnquiryResultSchema) body: UpdateEnquiryResultDto,
    ) {
        return this.service.update(id, body);
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.service.remove(id);
        return null;
    }

    @Post(':id/upload-screenshots')
    @UseInterceptors(FilesInterceptor('files', 10, {
        storage: diskStorage({
            destination: './uploads/enquiry-results',
            filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = extname(file.originalname);
                callback(null, `${uniqueSuffix}${ext}`);
            },
        }),
        limits: { fileSize: 25 * 1024 * 1024 },
    }))
    @HttpCode(HttpStatus.OK)
    async uploadScreenshots(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const filenames = files.map(f => f.filename);
        return { filenames };
    }

    @Post(':id/upload-documents')
    @UseInterceptors(FilesInterceptor('files', 10, {
        storage: diskStorage({
            destination: './uploads/enquiry-results',
            filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = extname(file.originalname);
                callback(null, `${uniqueSuffix}${ext}`);
            },
        }),
        limits: { fileSize: 25 * 1024 * 1024 },
    }))
    @HttpCode(HttpStatus.OK)
    async uploadDocuments(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const filenames = files.map(f => f.filename);
        return { filenames };
    }

    @Post(':id/followup')
    async createFollowup(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @Req() req: any,
    ) {
        const userId = req.user?.id ?? req.user?.sub;
        return this.service.createFollowup(id, body, userId);
    }
}
