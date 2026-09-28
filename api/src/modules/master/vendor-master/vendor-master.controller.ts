import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { z } from "zod";
import { VendorMasterService } from "@/modules/master/vendor-master/vendor-master.service";

const CreateVendorOrganizationSchema = z.object({
    name: z.string().min(1).max(255),
    alias: z.string().max(255).optional().nullable(),
    msme: z.string().max(50).optional().nullable(),
    pan: z.string().max(100).optional().nullable(),
    address: z.string().optional(),
    status: z.boolean().optional().default(true),
});

const UpdateVendorOrganizationSchema = CreateVendorOrganizationSchema.partial();

const CreateVendorSchema = z.object({
    orgId: z.number().optional(),
    name: z.string().trim().min(1).max(255),
    email: z.string().trim().email(),
    mobile: z.string().trim().min(1).max(22),
    address: z.string().trim().optional(),
});

const UpdateVendorSchema = CreateVendorSchema.partial();

const CreateVendorGstSchema = z.object({
    orgId: z.number().min(1),
    gstState: z.string().min(1).max(255).nullish(),
    gstNo: z.string().min(1).max(255).nullish(),
    address: z.string().trim().max(500).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateVendorGstSchema = CreateVendorGstSchema.partial();

const CreateVendorAccountSchema = z.object({
    orgId: z.number().min(1),
    bankAccountName: z.string().min(1).max(255),
    accountNum: z.string().min(1).max(255),
    ifscCode: z.string().min(1).max(255),
    status: z.boolean().optional().default(true),
});

const UpdateVendorAccountSchema = CreateVendorAccountSchema.partial();

const CreateVendorFileSchema = z.object({
    orgId: z.number().min(1),
    name: z.string().min(1).max(255),
    filePath: z.string().min(1).max(255),
});

const UpdateVendorFileSchema = CreateVendorFileSchema.partial();

@Controller()
export class VendorMasterController {
    constructor(private readonly vendorMasterService: VendorMasterService) {}

    @Get("vendor-organizations")
    async listOrganizations() {
        return this.vendorMasterService.findAllOrganizations();
    }

    @Get("vendor-organizations/with-relations")
    async listOrganizationsWithRelations() {
        return this.vendorMasterService.findAllOrganizationsWithRelations();
    }

    @Get("vendor-organizations/:id")
    async getOrganizationById(@Param("id", ParseIntPipe) id: number) {
        return this.vendorMasterService.findOrganizationById(id);
    }

    @Get("vendor-organizations/:id/with-relations")
    async getOrganizationByIdWithRelations(@Param("id", ParseIntPipe) id: number) {
        return this.vendorMasterService.findOrganizationByIdWithRelations(id);
    }

    @Post("vendor-organizations")
    @HttpCode(HttpStatus.CREATED)
    async createOrganization(@Body() body: unknown) {
        const parsed = CreateVendorOrganizationSchema.parse(body);
        return this.vendorMasterService.createOrganization(parsed);
    }

    @Post("vendor-organizations/with-relations")
    @HttpCode(HttpStatus.CREATED)
    async createOrganizationWithRelations(@Body() body: unknown) {
        return this.vendorMasterService.createOrganizationWithRelations(body as any);
    }

    @Patch("vendor-organizations/:id")
    async updateOrganization(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorOrganizationSchema.parse(body);
        return this.vendorMasterService.updateOrganization(id, parsed);
    }

    @Patch("vendor-organizations/:id/with-relations")
    async updateOrganizationWithRelations(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.vendorMasterService.updateOrganizationWithRelations(id, body as any);
    }

    @Get("vendors")
    async listVendors() {
        console.log("Fetching all vendors");
        return this.vendorMasterService.findAllVendors();
    }

    @Get("vendors/:id")
    async getVendorById(@Param("id", ParseIntPipe) id: number) {
        return this.vendorMasterService.findVendorById(id);
    }

    @Get("vendors/:id/with-relations")
    async getVendorByIdWithRelations(@Param("id", ParseIntPipe) id: number) {
        return this.vendorMasterService.findVendorByIdWithRelations(id);
    }

    @Get("vendors/organization/:organizationId")
    async getVendorsByOrganization(@Param("organizationId", ParseIntPipe) organizationId: number) {
        return this.vendorMasterService.findVendorsByOrganization(organizationId);
    }

    @Post("vendors")
    @HttpCode(HttpStatus.CREATED)
    async createVendor(@Body() body: unknown) {
        const parsed = CreateVendorSchema.parse(body);
        return this.vendorMasterService.createVendor(parsed);
    }

    @Patch("vendors/:id")
    async updateVendor(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorSchema.parse(body);
        return this.vendorMasterService.updateVendor(id, parsed);
    }

    @Delete("vendors/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteVendor(@Param("id", ParseIntPipe) id: number) {
        await this.vendorMasterService.deleteVendor(id);
    }

    @Get("vendor-gsts")
    async listGsts() {
        return this.vendorMasterService.findAllGsts();
    }

    @Get("vendor-gsts/:id")
    async getGstById(@Param("id", ParseIntPipe) id: number) {
        return this.vendorMasterService.findGstById(id);
    }

    @Get("vendor-gsts/organization/:orgId")
    async getGstsByOrganization(@Param("orgId", ParseIntPipe) orgId: number) {
        return this.vendorMasterService.findGstsByOrganization(orgId);
    }

    @Post("vendor-gsts")
    @HttpCode(HttpStatus.CREATED)
    async createGst(@Body() body: unknown) {
        const parsed = CreateVendorGstSchema.parse(body);
        return this.vendorMasterService.createGst(parsed);
    }

    @Patch("vendor-gsts/:id")
    async updateGst(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorGstSchema.parse(body);
        return this.vendorMasterService.updateGst(id, parsed);
    }

    @Delete("vendor-gsts/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteGst(@Param("id", ParseIntPipe) id: number) {
        await this.vendorMasterService.deleteGst(id);
    }

    @Get("vendor-accounts")
    async listAccounts() {
        return this.vendorMasterService.findAllAccounts();
    }

    @Get("vendor-accounts/:id")
    async getAccountById(@Param("id", ParseIntPipe) id: number) {
        return this.vendorMasterService.findAccountById(id);
    }

    @Get("vendor-accounts/organization/:orgId")
    async getAccountsByOrganization(@Param("orgId", ParseIntPipe) orgId: number) {
        return this.vendorMasterService.findAccountsByOrganization(orgId);
    }

    @Post("vendor-accounts")
    @HttpCode(HttpStatus.CREATED)
    async createAccount(@Body() body: unknown) {
        const parsed = CreateVendorAccountSchema.parse(body);
        return this.vendorMasterService.createAccount(parsed);
    }

    @Patch("vendor-accounts/:id")
    async updateAccount(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorAccountSchema.parse(body);
        return this.vendorMasterService.updateAccount(id, parsed);
    }

    @Delete("vendor-accounts/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteAccount(@Param("id", ParseIntPipe) id: number) {
        await this.vendorMasterService.deleteAccount(id);
    }

    @Get("vendor-files")
    async listVendorFiles() {
        return this.vendorMasterService.findAllVendorFiles();
    }

    @Get("vendor-files/:id")
    async getVendorFileById(@Param("id", ParseIntPipe) id: number) {
        return this.vendorMasterService.findVendorFileById(id);
    }

    @Get("vendor-files/org/:orgId")
    async getVendorFilesByOrg(@Param("orgId", ParseIntPipe) orgId: number) {
        return this.vendorMasterService.findVendorFilesByOrganization(orgId);
    }

    @Post("vendor-files")
    @HttpCode(HttpStatus.CREATED)
    async createVendorFile(@Body() body: unknown) {
        const parsed = CreateVendorFileSchema.parse(body);
        return this.vendorMasterService.createVendorFile(parsed);
    }

    @Patch("vendor-files/:id")
    async updateVendorFile(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorFileSchema.parse(body);
        return this.vendorMasterService.updateVendorFile(id, parsed);
    }

    @Delete("vendor-files/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteVendorFile(@Param("id", ParseIntPipe) id: number) {
        await this.vendorMasterService.deleteVendorFile(id);
    }
}
