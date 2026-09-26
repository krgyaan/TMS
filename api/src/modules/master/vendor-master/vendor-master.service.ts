import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { eq, asc } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { ClientDirectorySyncService } from "@/modules/shared/client-directory/client-directory-sync.service";
import { vendorOrganizations, type VendorOrganization, type NewVendorOrganization } from "@db/schemas/vendors/vendor-organizations.schema";
import { vendors, type Vendor, type NewVendor } from "@db/schemas/vendors/vendors.schema";
import { vendorGsts, type VendorGst, type NewVendorGst } from "@db/schemas/vendors/vendor-gsts.schema";
import { vendorAccs, type VendorAcc, type NewVendorAcc } from "@db/schemas/vendors/vendor-banks.schema";
import { vendorFiles, type VendorFile, type NewVendorFile } from "@db/schemas/vendors/vendor-files.schema";

@Injectable()
export class VendorMasterService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly clientDirectorySyncService: ClientDirectorySyncService
    ) {}

    /**
     * Get all vendor organizations (flat list)
     */
    async findAllOrganizations(): Promise<VendorOrganization[]> {
        const res = await this.db.select().from(vendorOrganizations).orderBy(asc(vendorOrganizations.name));
        return res;
    }

    /**
     * Get single vendor organization
     */
    async findOrganizationById(id: number): Promise<VendorOrganization> {
        const result = await this.db.select().from(vendorOrganizations).where(eq(vendorOrganizations.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor Organization with ID ${id} not found`);
        }

        return result[0];
    }

    /**
     * Get vendor organization with ALL related data
     * (vendors, GSTs, accounts, files from all persons)
     */
    async findOrganizationByIdWithRelations(id: number) {
        // Get organization
        const organization = await this.findOrganizationById(id);

        // Get all vendors (persons) in this organization
        const persons = await this.db.select().from(vendors).where(eq(vendors.orgId, id));

        // Get all GST numbers for this organization
        const gsts = await this.db.select().from(vendorGsts).where(eq(vendorGsts.orgId, id));

        // Get all bank accounts for this organization
        const accounts = await this.db.select().from(vendorAccs).where(eq(vendorAccs.orgId, id));

        // Get all files for this organization
        const files = await this.db.select().from(vendorFiles).where(eq(vendorFiles.orgId, id));

        return {
            ...organization,
            persons,
            gsts,
            accounts,
            files,
        };
    }

    /**
     * Get vendor organization with ALL related data including files
     */
    async findOrganizationByIdWithAllRelations(id: number) {
        return this.findOrganizationByIdWithRelations(id);
    }

    /**
     * Get ALL organizations with their related data
     * (for the expandable list view)
     */
    async findAllOrganizationsWithRelations() {
        const orgs = await this.findAllOrganizations();

        // Fetch related data for all organizations
        const orgsWithRelations = await Promise.all(
            orgs.map(async org => {
                const persons = await this.db.select().from(vendors).where(eq(vendors.orgId, org.id));

                const gsts = await this.db.select().from(vendorGsts).where(eq(vendorGsts.orgId, org.id));

                const accounts = await this.db.select().from(vendorAccs).where(eq(vendorAccs.orgId, org.id));

                const files = await this.db.select().from(vendorFiles).where(eq(vendorFiles.orgId, org.id));

                return {
                    ...org,
                    persons,
                    gsts,
                    accounts,
                    files,
                    _counts: {
                        persons: persons.length,
                        gsts: gsts.length,
                        accounts: accounts.length,
                        files: files.length,
                    },
                };
            })
        );

        return orgsWithRelations;
    }

    async createOrganization(data: NewVendorOrganization): Promise<VendorOrganization> {
        try {
            const rows = await this.db.insert(vendorOrganizations).values(data).returning();
            return rows[0];
        } catch (error: any) {
            if (error.code === "23505" || error.cause?.code === "23505") {
                throw new ConflictException(`Vendor Organization with name "${data.name}" already exists`);
            }
            throw error;
        }
    }

    async updateOrganization(id: number, data: Partial<NewVendorOrganization>): Promise<VendorOrganization> {
        try {
            const rows = await this.db
                .update(vendorOrganizations)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(vendorOrganizations.id, id))
                .returning();

            if (!rows[0]) {
                throw new NotFoundException(`Vendor Organization with ID ${id} not found`);
            }
            return rows[0];
        } catch (error: any) {
            if (error.code === "23505" || error.cause?.code === "23505") {
                throw new ConflictException(`A Vendor Organization with this name already exists`);
            }
            throw error;
        }
    }

    async deleteOrganization(id: number): Promise<void> {
        const result = await this.db.delete(vendorOrganizations).where(eq(vendorOrganizations.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor Organization with ID ${id} not found`);
        }
    }

    /**
     * Create organization with nested relations (GSTs, accounts, persons, files)
     */
    async createOrganizationWithRelations(data: {
        organization: NewVendorOrganization;
        gsts?: Omit<NewVendorGst, "orgId">[];
        accounts?: Omit<NewVendorAcc, "orgId">[];
        persons?: Omit<NewVendor, "orgId">[];
        files?: Omit<NewVendorFile, "orgId">[];
    }) {
        // Create organization first
        const organization = await this.createOrganization(data.organization);

        // Create GSTs
        if (data.gsts && data.gsts.length > 0) {
            await this.db.insert(vendorGsts).values(
                data.gsts.map(gst => ({
                    ...gst,
                    orgId: organization.id,
                }))
            );
        }

        // Create accounts
        if (data.accounts && data.accounts.length > 0) {
            await this.db.insert(vendorAccs).values(
                data.accounts.map(acc => ({
                    ...acc,
                    orgId: organization.id,
                }))
            );
        }

        // Create persons
        if (data.persons && data.persons.length > 0) {
            await this.db.insert(vendors).values(
                data.persons.map(personFields => ({
                    ...personFields,
                    name: personFields.name?.trim(),
                    email: personFields.email?.trim(),
                    mobile: personFields.mobile?.trim(),
                    address: personFields.address?.trim(),
                    orgId: organization.id,
                }))
            );
        }

        // Create files (belong to the organization)
        if (data.files && data.files.length > 0) {
            await this.db.insert(vendorFiles).values(
                data.files.map(file => ({
                    ...file,
                    orgId: organization.id,
                }))
            );
        }

        // Return organization with all relations
        return this.findOrganizationByIdWithAllRelations(organization.id);
    }

    /**
     * Update organization and related entities
     */
    async updateOrganizationWithRelations(
        id: number,
        data: {
            organization?: Partial<NewVendorOrganization>;
            gsts?: {
                create?: Omit<NewVendorGst, "orgId">[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendorGst, "orgId">> }>;
                delete?: number[];
            };
            accounts?: {
                create?: Omit<NewVendorAcc, "orgId">[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendorAcc, "orgId">> }>;
                delete?: number[];
            };
            persons?: {
                create?: Omit<NewVendor, "orgId">[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendor, "orgId">> }>;
                delete?: number[];
            };
            files?: {
                create?: Omit<NewVendorFile, "orgId">[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendorFile, "orgId">> }>;
                delete?: number[];
            };
        }
    ) {
        // Update organization
        if (data.organization) {
            await this.updateOrganization(id, data.organization);
        }

        // Handle GSTs
        if (data.gsts) {
            if (data.gsts.create && data.gsts.create.length > 0) {
                await this.db.insert(vendorGsts).values(
                    data.gsts.create.map(gst => ({
                        ...gst,
                        orgId: id,
                    }))
                );
            }
            if (data.gsts.update) {
                for (const { id: gstId, data: gstData } of data.gsts.update) {
                    await this.db
                        .update(vendorGsts)
                        .set({ ...gstData, updatedAt: new Date() })
                        .where(eq(vendorGsts.id, gstId));
                }
            }
            if (data.gsts.delete && data.gsts.delete.length > 0) {
                for (const gstId of data.gsts.delete) {
                    await this.db.delete(vendorGsts).where(eq(vendorGsts.id, gstId));
                }
            }
        }

        // Handle accounts
        if (data.accounts) {
            if (data.accounts.create && data.accounts.create.length > 0) {
                await this.db.insert(vendorAccs).values(
                    data.accounts.create.map(acc => ({
                        ...acc,
                        orgId: id,
                    }))
                );
            }
            if (data.accounts.update) {
                for (const { id: accId, data: accData } of data.accounts.update) {
                    await this.db
                        .update(vendorAccs)
                        .set({ ...accData, updatedAt: new Date() })
                        .where(eq(vendorAccs.id, accId));
                }
            }
            if (data.accounts.delete && data.accounts.delete.length > 0) {
                for (const accId of data.accounts.delete) {
                    await this.db.delete(vendorAccs).where(eq(vendorAccs.id, accId));
                }
            }
        }

        // Handle persons
        if (data.persons) {
            if (data.persons.create && data.persons.create.length > 0) {
                await this.db.insert(vendors).values(
                    data.persons.create.map(personFields => ({
                        ...personFields,
                        name: personFields.name?.trim(),
                        email: personFields.email?.trim(),
                        mobile: personFields.mobile?.trim(),
                        address: personFields.address?.trim(),
                        orgId: id,
                    }))
                );
            }
            if (data.persons.update) {
                for (const { id: personId, data: personData } of data.persons.update) {
                    const trimmedPersonData = {
                        ...personData,
                        name: personData.name?.trim(),
                        email: personData.email?.trim(),
                        mobile: personData.mobile?.trim(),
                        address: personData.address?.trim(),
                    };
                    await this.db
                        .update(vendors)
                        .set({ ...trimmedPersonData, updatedAt: new Date() })
                        .where(eq(vendors.id, personId));
                }
            }
            if (data.persons.delete && data.persons.delete.length > 0) {
                for (const personId of data.persons.delete) {
                    await this.db.delete(vendors).where(eq(vendors.id, personId));
                }
            }
        }

        // Handle files (belong to the organization)
        if (data.files) {
            if (data.files.create && data.files.create.length > 0) {
                await this.db.insert(vendorFiles).values(
                    data.files.create.map(file => ({
                        ...file,
                        orgId: id,
                    }))
                );
            }
            if (data.files.update) {
                for (const { id: fileId, data: fileData } of data.files.update) {
                    await this.db
                        .update(vendorFiles)
                        .set({ ...fileData, updatedAt: new Date() })
                        .where(eq(vendorFiles.id, fileId));
                }
            }
            if (data.files.delete && data.files.delete.length > 0) {
                for (const fileId of data.files.delete) {
                    await this.db.delete(vendorFiles).where(eq(vendorFiles.id, fileId));
                }
            }
        }

        // Return updated organization with all relations
        return this.findOrganizationByIdWithAllRelations(id);
    }

    /**
     * Select fields with organization
     */
    private getSelectWithOrganization() {
        return {
            id: vendors.id,
            organizationId: vendors.orgId,
            name: vendors.name,
            email: vendors.email,
            address: vendors.address,
            createdAt: vendors.createdAt,
            updatedAt: vendors.updatedAt,
            // Include organization
            organization: {
                id: vendorOrganizations.id,
                name: vendorOrganizations.name,
                alias: vendorOrganizations.alias,
                msme: vendorOrganizations.msme,
                pan: vendorOrganizations.pan,
                address: vendorOrganizations.address,
            },
        };
    }

    /**
     * Get all vendors with organization
     */
    async findAllVendors() {
        return this.db.select(this.getSelectWithOrganization()).from(vendors).leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id));
    }

    /**
     * Get single vendor with organization
     */
    async findVendorById(id: number) {
        const result = await this.db
            .select(this.getSelectWithOrganization())
            .from(vendors)
            .leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id))
            .where(eq(vendors.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor with ID ${id} not found`);
        }

        return result[0];
    }

    /**
     * Get vendor with ALL related data (files, organization)
     * This returns nested structure for detail view
     */
    async findVendorByIdWithRelations(id: number) {
        // Get vendor with organization
        const vendor = await this.findVendorById(id);

        // Get files for this vendor's organization
        const files = vendor.organizationId ? await this.db.select().from(vendorFiles).where(eq(vendorFiles.orgId, vendor.organizationId)) : [];

        return {
            ...vendor,
            files,
        };
    }

    /**
     * Get vendors by organization
     */
    async findVendorsByOrganization(organizationId: number) {
        return this.db
            .select(this.getSelectWithOrganization())
            .from(vendors)
            .leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id))
            .where(eq(vendors.orgId, organizationId));
    }

    async createVendor(data: NewVendor): Promise<Vendor> {
        const trimmedData = {
            ...data,
            name: data.name?.trim(),
            email: data.email?.trim(),
            mobile: data.mobile?.trim(),
            address: data.address?.trim(),
        };
        const rows = await this.db.insert(vendors).values(trimmedData).returning();
        const vendor = rows[0];
        if (vendor.name) {
            await this.clientDirectorySyncService.syncToClientDirectory([
                {
                    name: vendor.name,
                    email: vendor.email,
                    phone: vendor.mobile,
                    org: null,
                },
            ]);
        }
        return vendor;
    }

    async updateVendor(id: number, data: Partial<NewVendor>): Promise<Vendor> {
        const trimmedData = {
            ...data,
            name: data.name?.trim(),
            email: data.email?.trim(),
            mobile: data.mobile?.trim(),
            address: data.address?.trim(),
        };
        const rows = await this.db
            .update(vendors)
            .set({ ...trimmedData, updatedAt: new Date() })
            .where(eq(vendors.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Vendor with ID ${id} not found`);
        }
        const vendor = rows[0];
        if (vendor.name && (data.name || data.email || data.mobile)) {
            await this.clientDirectorySyncService.syncToClientDirectory([
                {
                    name: vendor.name,
                    email: vendor.email,
                    phone: vendor.mobile,
                    org: null,
                },
            ]);
        }
        return vendor;
    }

    async deleteVendor(id: number): Promise<void> {
        const result = await this.db.delete(vendors).where(eq(vendors.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor with ID ${id} not found`);
        }
    }

    async findAllGsts(): Promise<VendorGst[]> {
        return this.db.select().from(vendorGsts);
    }

    async findGstById(id: number): Promise<VendorGst> {
        const result = await this.db.select().from(vendorGsts).where(eq(vendorGsts.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor GST with ID ${id} not found`);
        }

        return result[0];
    }

    async findGstsByOrganization(orgId: number): Promise<VendorGst[]> {
        return this.db.select().from(vendorGsts).where(eq(vendorGsts.orgId, orgId));
    }

    async createGst(data: NewVendorGst): Promise<VendorGst> {
        const rows = await this.db.insert(vendorGsts).values(data).returning();
        return rows[0];
    }

    async updateGst(id: number, data: Partial<NewVendorGst>): Promise<VendorGst> {
        const rows = await this.db
            .update(vendorGsts)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(vendorGsts.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Vendor GST with ID ${id} not found`);
        }
        return rows[0];
    }

    async deleteGst(id: number): Promise<void> {
        const result = await this.db.delete(vendorGsts).where(eq(vendorGsts.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor GST with ID ${id} not found`);
        }
    }

    async findAllAccounts(): Promise<VendorAcc[]> {
        return this.db.select().from(vendorAccs);
    }

    async findAccountById(id: number): Promise<VendorAcc> {
        const result = await this.db.select().from(vendorAccs).where(eq(vendorAccs.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor Account with ID ${id} not found`);
        }

        return result[0];
    }

    async findAccountsByOrganization(orgId: number): Promise<VendorAcc[]> {
        return this.db.select().from(vendorAccs).where(eq(vendorAccs.orgId, orgId));
    }

    async createAccount(data: NewVendorAcc): Promise<VendorAcc> {
        const rows = await this.db.insert(vendorAccs).values(data).returning();
        return rows[0];
    }

    async updateAccount(id: number, data: Partial<NewVendorAcc>): Promise<VendorAcc> {
        const rows = await this.db
            .update(vendorAccs)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(vendorAccs.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Vendor Account with ID ${id} not found`);
        }
        return rows[0];
    }

    async deleteAccount(id: number): Promise<void> {
        const result = await this.db.delete(vendorAccs).where(eq(vendorAccs.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor Account with ID ${id} not found`);
        }
    }

    async findAllVendorFiles(): Promise<VendorFile[]> {
        return this.db.select().from(vendorFiles);
    }

    async findVendorFileById(id: number): Promise<VendorFile> {
        const result = await this.db.select().from(vendorFiles).where(eq(vendorFiles.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor File with ID ${id} not found`);
        }

        return result[0];
    }

    async findVendorFilesByOrganization(orgId: number): Promise<VendorFile[]> {
        return this.db.select().from(vendorFiles).where(eq(vendorFiles.orgId, orgId));
    }

    async createVendorFile(data: NewVendorFile): Promise<VendorFile> {
        const rows = await this.db.insert(vendorFiles).values(data).returning();
        return rows[0];
    }

    async updateVendorFile(id: number, data: Partial<NewVendorFile>): Promise<VendorFile> {
        const rows = await this.db
            .update(vendorFiles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(vendorFiles.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Vendor File with ID ${id} not found`);
        }
        return rows[0];
    }

    async deleteVendorFile(id: number): Promise<void> {
        const result = await this.db.delete(vendorFiles).where(eq(vendorFiles.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor File with ID ${id} not found`);
        }
    }
}
