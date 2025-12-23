import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    UseInterceptors,
    UploadedFiles,
    Res,
    StreamableFile,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { TenderFilesService } from './tender-files.service';
import { FILE_CONFIGS, type TenderFileContext } from './config/file-configs';

// Validation schema
const ContextSchema = z.enum(Object.keys(FILE_CONFIGS) as [TenderFileContext, ...TenderFileContext[]]);

const UploadBodySchema = z.object({
    context: ContextSchema,
});

@Controller('tender-files')
export class TenderFilesController {
    constructor(private readonly service: TenderFilesService) { }

    /**
     * Get all configs (for frontend)
     */
    @Public()
    @Get('configs')
    getAllConfigs() {
        return this.service.getAllConfigs();
    }

    /**
     * Get config for a specific context
     */
    @Public()
    @Get('config/:context')
    getConfig(@Param('context') context: string) {
        const parsed = ContextSchema.parse(context);
        return this.service.getConfig(parsed);
    }

    /**
     * Upload files
     * POST /tender-files/upload
     * Body: { context: 'emds' }
     * Files: multipart form-data
     */
    @Post('upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
        }),
    )
    async upload(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() body: unknown,
    ) {
        const { context } = UploadBodySchema.parse(body);
        return this.service.upload(files, context);
    }

    /**
     * Serve/Download file
     * GET /tender-files/serve/:context/:fileName
     */
    @Get('serve/:context/:fileName')
    async serve(
        @Param('context') context: string,
        @Param('fileName') fileName: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const parsedContext = ContextSchema.parse(context);
        const filePath = path.join(parsedContext, fileName);

        const exists = await this.service.exists(filePath);
        if (!exists) {
            throw new NotFoundException('File not found');
        }

        const absolutePath = this.service.getAbsolutePath(filePath);
        const ext = path.extname(fileName).toLowerCase();

        // Set content type
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
        };

        res.set({
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
            'Cache-Control': 'private, max-age=3600',
        });

        const stream = createReadStream(absolutePath);
        return new StreamableFile(stream);
    }

    /**
     * Delete file
     * DELETE /tender-files/:context/:fileName
     */
    @Delete(':context/:fileName')
    @HttpCode(HttpStatus.OK)
    async delete(
        @Param('context') context: string,
        @Param('fileName') fileName: string,
    ) {
        const parsedContext = ContextSchema.parse(context);
        const filePath = path.join(parsedContext, fileName);
        await this.service.delete(filePath);
        return { success: true, message: 'File deleted' };
    }
}
