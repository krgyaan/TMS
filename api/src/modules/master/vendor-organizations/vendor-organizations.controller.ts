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
import { VendorOrganizationsService } from '@/modules/master/vendor-organizations/vendor-organizations.service';

const CreateVendorOrganizationSchema = z.object({
    name: z.string().min(1).max(255),
    address: z.string().optional(),
    status: z.boolean().optional().default(true),
});

const UpdateVendorOrganizationSchema = CreateVendorOrganizationSchema.partial();

@Controller('vendor-organizations')
export class VendorOrganizationsController {
    constructor(
        private readonly vendorOrganizationsService: VendorOrganizationsService,
    ) { }

    @Get()
    async list() {
        return this.vendorOrganizationsService.findAll();
    }

    @Get('with-relations')
    async listWithRelations() {
        return this.vendorOrganizationsService.findAllWithRelations();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.vendorOrganizationsService.findById(id);
    }

    @Get(':id/with-relations')
    async getByIdWithRelations(@Param('id', ParseIntPipe) id: number) {
        return this.vendorOrganizationsService.findByIdWithRelations(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateVendorOrganizationSchema.parse(body);
        return this.vendorOrganizationsService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorOrganizationSchema.parse(body);
        return this.vendorOrganizationsService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //     await this.vendorOrganizationsService.delete(id);
    // }
}
