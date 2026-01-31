import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { vendorGsts, type VendorGst, type NewVendorGst } from "@db/schemas/vendors/vendor-gsts.schema";

@Injectable()
export class VendorGstsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<VendorGst[]> {
        return this.db.select().from(vendorGsts);
    }

    async findById(id: number): Promise<VendorGst> {
        const result = await this.db.select().from(vendorGsts).where(eq(vendorGsts.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor GST with ID ${id} not found`);
        }

        return result[0];
    }

    async findByOrganization(orgId: number): Promise<VendorGst[]> {
        return this.db.select().from(vendorGsts).where(eq(vendorGsts.orgId, orgId));
    }

    async create(data: NewVendorGst): Promise<VendorGst> {
        const rows = await this.db.insert(vendorGsts).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewVendorGst>): Promise<VendorGst> {
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

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(vendorGsts).where(eq(vendorGsts.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor GST with ID ${id} not found`);
        }
    }
}
