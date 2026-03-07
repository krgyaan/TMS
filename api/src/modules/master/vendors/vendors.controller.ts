import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { z } from "zod";
import { VendorsService } from "@/modules/master/vendors/vendors.service";

const CreateVendorSchema = z.object({
    orgId: z.number().optional(),
    name: z.string().min(1).max(255),
    email: z.string().email(),
    mobile: z.string().min(1).max(22),
    address: z.string().optional(),
});

const UpdateVendorSchema = CreateVendorSchema.partial();

@Controller("vendors")
export class VendorsController {
    constructor(private readonly vendorsService: VendorsService) {}

    @Get()
    async list() {
        console.log("Fetching all vendors");
        return this.vendorsService.findAll();
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.vendorsService.findById(id);
    }

    @Get(":id/with-relations")
    async getByIdWithRelations(@Param("id", ParseIntPipe) id: number) {
        return this.vendorsService.findByIdWithRelations(id);
    }

    @Get("organization/:organizationId")
    async getByOrganization(@Param("organizationId", ParseIntPipe) organizationId: number) {
        return this.vendorsService.findByOrganization(organizationId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateVendorSchema.parse(body);
        return this.vendorsService.create(parsed);
    }

    @Patch(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorSchema.parse(body);
        return this.vendorsService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //   await this.vendorsService.delete(id);
    // }
}
