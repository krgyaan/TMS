import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    vendorAccs,
    type VendorAcc,
    type NewVendorAcc,
} from '@db/schemas/vendors/vendor-banks.schema';

@Injectable()
export class VendorAccountsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<VendorAcc[]> {
        return this.db.select().from(vendorAccs);
    }

    async findById(id: number): Promise<VendorAcc> {
        const result = await this.db
            .select()
            .from(vendorAccs)
            .where(eq(vendorAccs.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor Account with ID ${id} not found`);
        }

        return result[0];
    }

    async findByOrganization(orgId: number): Promise<VendorAcc[]> {
        return this.db
            .select()
            .from(vendorAccs)
            .where(eq(vendorAccs.org, orgId));
    }

    async create(data: NewVendorAcc): Promise<VendorAcc> {
        const rows = await this.db.insert(vendorAccs).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewVendorAcc>): Promise<VendorAcc> {
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

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(vendorAccs)
            .where(eq(vendorAccs.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor Account with ID ${id} not found`);
        }
    }
}
