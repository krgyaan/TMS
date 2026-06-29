import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { z } from 'zod';
import { CircularsService } from './circulars.service';
import { CurrentUser } from '@/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { existsSync, mkdirSync } from 'fs';

// Multer configuration for Circular documents
const circularMulterConfig = {
    storage: diskStorage({
        destination: (req, file, cb) => {
            const dir = './uploads/circulars';
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `circular-${uniqueSuffix}${ext}`);
        },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
};

const CreateCircularSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    valid_from: z.string().min(1, 'Valid from date is required'),
    expires_on: z.string().min(1, 'Expires on date is required'),
    status: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
});

const UpdateCircularSchema = CreateCircularSchema.partial();

@Controller('circular')
export class CircularsController {
    constructor(private readonly service: CircularsService) {}

    @Get()
    async list() {
        return this.service.findAll();
    }

    @Get('active')
    async listActive() {
        return this.service.findActive();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {

        const circular = await this.service.findById(id);
        if (!circular) {
            throw new NotFoundException(`Circular with ID ${id} not found`);
        }
        return circular;
    }

    @Post()
    @UseInterceptors(FileInterceptor('file', circularMulterConfig))
    async create(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser,
    ) {
        if (!file) {
            throw new NotFoundException('Circular file is required');
        }
        const parsed = CreateCircularSchema.parse(body);

        return this.service.create({
            title: parsed.title,
            file: file.path.replace(/\\/g, '/'), // Normalize path separators
            status: parsed.status,
            valid_from: new Date(parsed.valid_from),
            expires_on: new Date(parsed.expires_on),
            uploaded_by: user.name,
        });
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('file', circularMulterConfig))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
        @Body() body: unknown,
    ) {
        const circular = await this.service.findById(id);
        if (!circular) {
            throw new NotFoundException(`Circular with ID ${id} not found`);
        }

        const parsed = UpdateCircularSchema.parse(body);

        const payload: any = {};
        if (parsed.title !== undefined) payload.title = parsed.title;
        if (parsed.status !== undefined) payload.status = parsed.status;
        if (parsed.valid_from !== undefined) payload.valid_from = new Date(parsed.valid_from);
        if (parsed.expires_on !== undefined) payload.expires_on = new Date(parsed.expires_on);

        if (file) {
            // Delete old file
            this.deleteFileOnDisk(circular.file);
            payload.file = file.path.replace(/\\/g, '/');
        }

        return this.service.update(id, payload);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        const circular = await this.service.findById(id);
        if (!circular) {
            throw new NotFoundException(`Circular with ID ${id} not found`);
        }

        // Delete old file
        this.deleteFileOnDisk(circular.file);

        await this.service.delete(id);
    }

    private deleteFileOnDisk(filePath: string) {
        try {
            const fs = require('fs');
            const path = require('path');
            const fullPath = path.resolve(filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (err) {
            console.error(`Error deleting file ${filePath}:`, err);
        }
    }
}
