import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { z } from "zod";
import { VendorGstsService } from "@/modules/master/vendor-gsts/vendor-gsts.service";

const CreateVendorGstSchema = z.object({
    orgId: z.number().min(1),
    gstState: z.string().min(1).max(255),
    gstNum: z.string().min(1).max(255),
    status: z.boolean().optional().default(true),
});

const UpdateVendorGstSchema = CreateVendorGstSchema.partial();

@Controller("vendor-gsts")
export class VendorGstsController {
    constructor(private readonly vendorGstsService: VendorGstsService) {}

    @Get()
    async list() {
        return this.vendorGstsService.findAll();
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.vendorGstsService.findById(id);
    }

    @Get("organization/:orgId")
    async getByOrganization(@Param("orgId", ParseIntPipe) orgId: number) {
        return this.vendorGstsService.findByOrganization(orgId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateVendorGstSchema.parse(body);
        return this.vendorGstsService.create(parsed);
    }

    @Patch(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorGstSchema.parse(body);
        return this.vendorGstsService.update(id, parsed);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) {
        await this.vendorGstsService.delete(id);
    }
}
