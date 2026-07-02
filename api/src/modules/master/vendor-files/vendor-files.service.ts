import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { vendorFiles, type VendorFile, type NewVendorFile } from "@db/schemas/vendors/vendor-files.schema";

@Injectable()
export class VendorFilesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<VendorFile[]> {
        return this.db.select().from(vendorFiles);
    }

    async findById(id: number): Promise<VendorFile> {
        const result = await this.db.select().from(vendorFiles).where(eq(vendorFiles.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor File with ID ${id} not found`);
        }

        return result[0];
    }

    async findByVendor(vendorId: number): Promise<VendorFile[]> {
        return this.db.select().from(vendorFiles).where(eq(vendorFiles.vendorId, vendorId));
    }

    async create(data: NewVendorFile): Promise<VendorFile> {
        const rows = await this.db.insert(vendorFiles).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewVendorFile>): Promise<VendorFile> {
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

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(vendorFiles).where(eq(vendorFiles.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor File with ID ${id} not found`);
        }
    }
}
