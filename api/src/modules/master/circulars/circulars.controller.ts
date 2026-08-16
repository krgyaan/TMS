import { CurrentUser } from '@/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { z } from 'zod';
import { CircularsService } from './circulars.service';

const CreateCircularSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    valid_from: z.string().min(1, 'Valid from date is required'),
    expires_on: z.string().min(1, 'Expires on date is required'),
    status: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
    file: z.string().min(1, 'Circular file is required'),
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
    async create(
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser,
    ) {
        const parsed = CreateCircularSchema.parse(body);

        return this.service.create({
            title: parsed.title,
            file: parsed.file,
            status: parsed.status,
            valid_from: new Date(parsed.valid_from),
            expires_on: new Date(parsed.expires_on),
            uploaded_by: user.name,
        });
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const circular = await this.service.findById(id);
        if (!circular) {
            throw new NotFoundException(`Circular with ID ${id} not found`);
        }

        const parsed = UpdateCircularSchema.extend({ file: z.string().optional() }).parse(body);

        const payload: any = {};
        if (parsed.title !== undefined) payload.title = parsed.title;
        if (parsed.status !== undefined) payload.status = parsed.status;
        if (parsed.valid_from !== undefined) payload.valid_from = new Date(parsed.valid_from);
        if (parsed.expires_on !== undefined) payload.expires_on = new Date(parsed.expires_on);

        if (parsed.file) {
            this.deleteFileOnDisk(circular.file);
            payload.file = parsed.file;
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
            const fullPath = filePath.startsWith('/')
                ? resolve(filePath)
                : resolve(join(process.cwd(), 'uploads', filePath));
            if (existsSync(fullPath)) {
                unlinkSync(fullPath);
            }
        } catch (err) {
            console.error(`Error deleting file ${filePath}:`, err);
        }
    }
}
