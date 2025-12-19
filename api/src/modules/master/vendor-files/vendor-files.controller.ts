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
} from '@nestjs/common';
import { z } from 'zod';
import { VendorFilesService } from '@/modules/master/vendor-files/vendor-files.service';

const CreateVendorFileSchema = z.object({
    vendorId: z.number().min(1),
    name: z.string().min(1).max(255),
    filePath: z.string().min(1).max(255),
    status: z.boolean().optional().default(true),
});

const UpdateVendorFileSchema = CreateVendorFileSchema.partial();

@Controller('vendor-files')
export class VendorFilesController {
    constructor(private readonly vendorFilesService: VendorFilesService) { }

    @Get()
    async list() {
        return this.vendorFilesService.findAll();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.vendorFilesService.findById(id);
    }

    @Get('vendor/:vendorId')
    async getByVendor(@Param('vendorId', ParseIntPipe) vendorId: number) {
        return this.vendorFilesService.findByVendor(vendorId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateVendorFileSchema.parse(body);
        return this.vendorFilesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorFileSchema.parse(body);
        return this.vendorFilesService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.vendorFilesService.delete(id);
    }
}
