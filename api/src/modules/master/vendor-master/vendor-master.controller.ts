import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CanCreate, CanUpdate, CanDelete, CanRead } from "@/modules/auth/decorators";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { VendorMasterService } from "@/modules/master/vendor-master/vendor-master.service";

const VendorOrganizationFields = z.object({
    name: z.string().min(1).max(255),
    alias: z.string().max(255).optional().nullable(),
    msme: z.string().max(50).optional().nullable(),
    msmeType: z.enum(["M", "S"]).optional().nullable(),
    pan: z.string().max(100).optional().nullable(),
    address: z.string().optional(),
    status: z.boolean().optional().default(true),
});

// An MSME number is only meaningful once its type (M/S) is known, so reject the
// number alone. Existing rows are unaffected: this applies to incoming payloads only.
const requireMsmeType = (val: { msme?: string | null | undefined; msmeType?: "M" | "S" | null | undefined }, ctx: z.RefinementCtx) => {
    if (val.msme?.trim() && !val.msmeType) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["msmeType"],
            message: "MSME type is required when an MSME number is present",
        });
    }
};

const CreateVendorOrganizationSchema = VendorOrganizationFields.superRefine(requireMsmeType);

const UpdateVendorOrganizationSchema = VendorOrganizationFields.partial().superRefine(requireMsmeType);

const CreateVendorSchema = z.object({
    orgId: z.number().optional(),
    name: z.string().trim().min(1).max(255),
    email: z.union([z.literal(""), z.string().trim().email()]).optional(),
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
@UseGuards(JwtAuthGuard, PermissionGuard)
// `read` is the class-wide floor so every read route is covered without
// repeating itself; the mutating handlers below override it, because
// PermissionGuard resolves handler metadata before class metadata.
@CanRead("master.vendors")
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

    // Declared before vendor-organizations/:id so "paginated" is not parsed as an id.
    @Get("vendor-organizations/paginated")
    async listOrganizationsPaginated(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("search") search?: string,
        @Query("sortBy") sortBy?: string,
        @Query("sortOrder") sortOrder?: string
    ) {
        const toNumber = (value?: string): number | undefined => {
            if (!value) return undefined;
            const parsed = parseInt(value, 10);
            return Number.isNaN(parsed) ? undefined : parsed;
        };

        return this.vendorMasterService.findAllOrganizationsPaginated({
            page: toNumber(page),
            limit: toNumber(limit),
            search,
            sortBy,
            sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : undefined,
        });
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
    @CanCreate("master.vendors")
    async createOrganization(@Body() body: unknown) {
        const parsed = CreateVendorOrganizationSchema.parse(body);
        return this.vendorMasterService.createOrganization(parsed);
    }

    @Post("vendor-organizations/with-relations")
    @HttpCode(HttpStatus.CREATED)
    @CanCreate("master.vendors")
    async createOrganizationWithRelations(@Body() body: unknown) {
        return this.vendorMasterService.createOrganizationWithRelations(body as any);
    }

    @Patch("vendor-organizations/:id")
    @CanUpdate("master.vendors")
    async updateOrganization(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorOrganizationSchema.parse(body);
        return this.vendorMasterService.updateOrganization(id, parsed);
    }

    @Patch("vendor-organizations/:id/with-relations")
    @CanUpdate("master.vendors")
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
    @CanCreate("master.vendors")
    async createVendor(@Body() body: unknown) {
        const parsed = CreateVendorSchema.parse(body);
        return this.vendorMasterService.createVendor(parsed);
    }

    @Patch("vendors/:id")
    @CanUpdate("master.vendors")
    async updateVendor(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorSchema.parse(body);
        return this.vendorMasterService.updateVendor(id, parsed);
    }

    @Delete("vendors/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @CanDelete("master.vendors")
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
    @CanCreate("master.vendors")
    async createGst(@Body() body: unknown) {
        const parsed = CreateVendorGstSchema.parse(body);
        return this.vendorMasterService.createGst(parsed);
    }

    @Patch("vendor-gsts/:id")
    @CanUpdate("master.vendors")
    async updateGst(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorGstSchema.parse(body);
        return this.vendorMasterService.updateGst(id, parsed);
    }

    @Delete("vendor-gsts/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @CanDelete("master.vendors")
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
    @CanCreate("master.vendors")
    async createAccount(@Body() body: unknown) {
        const parsed = CreateVendorAccountSchema.parse(body);
        return this.vendorMasterService.createAccount(parsed);
    }

    @Patch("vendor-accounts/:id")
    @CanUpdate("master.vendors")
    async updateAccount(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorAccountSchema.parse(body);
        return this.vendorMasterService.updateAccount(id, parsed);
    }

    @Delete("vendor-accounts/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @CanDelete("master.vendors")
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
    @CanCreate("master.vendors")
    async createVendorFile(@Body() body: unknown) {
        const parsed = CreateVendorFileSchema.parse(body);
        return this.vendorMasterService.createVendorFile(parsed);
    }

    @Patch("vendor-files/:id")
    @CanUpdate("master.vendors")
    async updateVendorFile(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateVendorFileSchema.parse(body);
        return this.vendorMasterService.updateVendorFile(id, parsed);
    }

    @Delete("vendor-files/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @CanDelete("master.vendors")
    async deleteVendorFile(@Param("id", ParseIntPipe) id: number) {
        await this.vendorMasterService.deleteVendorFile(id);
    }
}
