import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    vendorOrganizations,
    type VendorOrganization,
    type NewVendorOrganization,
} from '@db/schemas/vendors/vendor-organizations.schema';
import { vendors, type NewVendor } from '@db/schemas/vendors/vendors.schema';
import { vendorGsts, type NewVendorGst } from '@db/schemas/vendors/vendor-gsts.schema';
import { vendorAccs, type NewVendorAcc } from '@db/schemas/vendors/vendor-banks.schema';
import { vendorFiles, type NewVendorFile } from '@db/schemas/vendors/vendor-files.schema';

@Injectable()
export class VendorOrganizationsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    /**
     * Get all vendor organizations (flat list)
     */
    async findAll(): Promise<VendorOrganization[]> {
        return this.db.select().from(vendorOrganizations);
    }

    /**
     * Get single vendor organization
     */
    async findById(id: number): Promise<VendorOrganization> {
        const result = await this.db
            .select()
            .from(vendorOrganizations)
            .where(eq(vendorOrganizations.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException(
                `Vendor Organization with ID ${id} not found`,
            );
        }

        return result[0];
    }

    /**
     * Get vendor organization with ALL related data
     * (vendors, GSTs, accounts, files from all persons)
     */
    async findByIdWithRelations(id: number) {
        // Get organization
        const organization = await this.findById(id);

        // Get all vendors (persons) in this organization
        const persons = await this.db
            .select()
            .from(vendors)
            .where(eq(vendors.organizationId, id));

        // Get all GST numbers for this organization
        const gsts = await this.db
            .select()
            .from(vendorGsts)
            .where(eq(vendorGsts.org, id));

        // Get all bank accounts for this organization
        const accounts = await this.db
            .select()
            .from(vendorAccs)
            .where(eq(vendorAccs.org, id));

        // Get all files from all persons in this organization
        const personIds = persons.map((p) => p.id);
        let files: typeof vendorFiles.$inferSelect[] = [];
        if (personIds.length > 0) {
            files = await this.db
                .select()
                .from(vendorFiles)
                .where(inArray(vendorFiles.vendorId, personIds));
        }

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
    async findByIdWithAllRelations(id: number) {
        return this.findByIdWithRelations(id);
    }

    /**
     * Get ALL organizations with their related data
     * (for the expandable list view)
     */
    async findAllWithRelations() {
        const orgs = await this.findAll();

        // Fetch related data for all organizations
        const orgsWithRelations = await Promise.all(
            orgs.map(async (org) => {
                const persons = await this.db
                    .select()
                    .from(vendors)
                    .where(eq(vendors.organizationId, org.id));

                const gsts = await this.db
                    .select()
                    .from(vendorGsts)
                    .where(eq(vendorGsts.org, org.id));

                const accounts = await this.db
                    .select()
                    .from(vendorAccs)
                    .where(eq(vendorAccs.org, org.id));

                return {
                    ...org,
                    persons,
                    gsts,
                    accounts,
                    _counts: {
                        persons: persons.length,
                        gsts: gsts.length,
                        accounts: accounts.length,
                    },
                };
            }),
        );

        return orgsWithRelations;
    }

    async create(data: NewVendorOrganization): Promise<VendorOrganization> {
        const rows = await this.db
            .insert(vendorOrganizations)
            .values(data)
            .returning();
        return rows[0];
    }

    async update(
        id: number,
        data: Partial<NewVendorOrganization>,
    ): Promise<VendorOrganization> {
        const rows = await this.db
            .update(vendorOrganizations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(vendorOrganizations.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(
                `Vendor Organization with ID ${id} not found`,
            );
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(vendorOrganizations)
            .where(eq(vendorOrganizations.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(
                `Vendor Organization with ID ${id} not found`,
            );
        }
    }

    /**
     * Create organization with nested relations (GSTs, accounts, persons, files)
     */
    async createWithRelations(data: {
        organization: NewVendorOrganization;
        gsts?: Omit<NewVendorGst, 'org'>[];
        accounts?: Omit<NewVendorAcc, 'org'>[];
        persons?: Array<
            Omit<NewVendor, 'organizationId'> & {
                files?: Omit<NewVendorFile, 'vendorId'>[];
            }
        >;
    }) {
        // Create organization first
        const organization = await this.create(data.organization);

        // Create GSTs
        if (data.gsts && data.gsts.length > 0) {
            await this.db.insert(vendorGsts).values(
                data.gsts.map((gst) => ({
                    ...gst,
                    org: organization.id,
                })),
            );
        }

        // Create accounts
        if (data.accounts && data.accounts.length > 0) {
            await this.db.insert(vendorAccs).values(
                data.accounts.map((acc) => ({
                    ...acc,
                    org: organization.id,
                })),
            );
        }

        // Create persons and their files
        if (data.persons && data.persons.length > 0) {
            for (const personData of data.persons) {
                const { files, ...personFields } = personData;
                const person = await this.db
                    .insert(vendors)
                    .values({
                        ...personFields,
                        organizationId: organization.id,
                    })
                    .returning();

                // Create files for this person
                if (files && files.length > 0 && person[0]) {
                    await this.db.insert(vendorFiles).values(
                        files.map((file) => ({
                            ...file,
                            vendorId: person[0].id,
                        })),
                    );
                }
            }
        }

        // Return organization with all relations
        return this.findByIdWithAllRelations(organization.id);
    }

    /**
     * Update organization and related entities
     */
    async updateWithRelations(
        id: number,
        data: {
            organization?: Partial<NewVendorOrganization>;
            gsts?: {
                create?: Omit<NewVendorGst, 'org'>[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendorGst, 'org'>> }>;
                delete?: number[];
            };
            accounts?: {
                create?: Omit<NewVendorAcc, 'org'>[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendorAcc, 'org'>> }>;
                delete?: number[];
            };
            persons?: {
                create?: Array<
                    Omit<NewVendor, 'organizationId'> & {
                        files?: Omit<NewVendorFile, 'vendorId'>[];
                    }
                >;
                update?: Array<{ id: number; data: Partial<Omit<NewVendor, 'organizationId'>> }>;
                delete?: number[];
            };
        },
    ) {
        // Update organization
        if (data.organization) {
            await this.update(id, data.organization);
        }

        // Handle GSTs
        if (data.gsts) {
            if (data.gsts.create && data.gsts.create.length > 0) {
                await this.db.insert(vendorGsts).values(
                    data.gsts.create.map((gst) => ({
                        ...gst,
                        org: id,
                    })),
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
                    data.accounts.create.map((acc) => ({
                        ...acc,
                        org: id,
                    })),
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
                for (const personData of data.persons.create) {
                    const { files, ...personFields } = personData;
                    const person = await this.db
                        .insert(vendors)
                        .values({
                            ...personFields,
                            organizationId: id,
                        })
                        .returning();

                    if (files && files.length > 0 && person[0]) {
                        await this.db.insert(vendorFiles).values(
                            files.map((file) => ({
                                ...file,
                                vendorId: person[0].id,
                            })),
                        );
                    }
                }
            }
            if (data.persons.update) {
                for (const { id: personId, data: personData } of data.persons.update) {
                    await this.db
                        .update(vendors)
                        .set({ ...personData, updatedAt: new Date() })
                        .where(eq(vendors.id, personId));
                }
            }
            if (data.persons.delete && data.persons.delete.length > 0) {
                for (const personId of data.persons.delete) {
                    await this.db.delete(vendors).where(eq(vendors.id, personId));
                }
            }
        }

        // Return updated organization with all relations
        return this.findByIdWithAllRelations(id);
    }
}
