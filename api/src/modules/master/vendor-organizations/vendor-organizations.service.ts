import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    vendorOrganizations,
    type VendorOrganization,
    type NewVendorOrganization,
} from '../../../db/vendor-organizations.schema';
import { vendors } from '../../../db/vendors.schema';
import { vendorGsts } from '../../../db/vendor-gsts.schema';
import { vendorAccs } from '../../../db/vendor-banks.schema';

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
     * (vendors, GSTs, accounts)
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

        return {
            ...organization,
            persons,
            gsts,
            accounts,
        };
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
}
