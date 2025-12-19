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
import { VendorAccountsService } from '@/modules/master/vendor-accounts/vendor-accounts.service';

const CreateVendorAccountSchema = z.object({
    org: z.number().min(1),
    accountName: z.string().min(1).max(255),
    accountNum: z.string().min(1).max(255),
    accountIfsc: z.string().min(1).max(255),
    status: z.boolean().optional().default(true),
});

const UpdateVendorAccountSchema = CreateVendorAccountSchema.partial();

@Controller('vendor-accounts')
export class VendorAccountsController {
    constructor(private readonly vendorAccountsService: VendorAccountsService) { }

    @Get()
    async list() {
        return this.vendorAccountsService.findAll();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.vendorAccountsService.findById(id);
    }

    @Get('organization/:orgId')
    async getByOrganization(@Param('orgId', ParseIntPipe) orgId: number) {
        return this.vendorAccountsService.findByOrganization(orgId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateVendorAccountSchema.parse(body);
        return this.vendorAccountsService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorAccountSchema.parse(body);
        return this.vendorAccountsService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.vendorAccountsService.delete(id);
    }
}
