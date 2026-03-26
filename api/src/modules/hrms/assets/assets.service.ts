import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { employeeAssets, type NewEmployeeAsset, type EmployeeAsset } from "@/db/schemas/hrms/employee-assets.schema";

function stripUndefined<T extends Record<string, any>>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

@Injectable()
export class AssetsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<EmployeeAsset[]> {
        return this.db.select().from(employeeAssets);
    }

    async findByUserId(userId: number): Promise<EmployeeAsset[]> {
        return this.db.select().from(employeeAssets).where(eq(employeeAssets.userId, userId));
    }

    async findById(id: number): Promise<EmployeeAsset | null> {
        const rows = await this.db.select().from(employeeAssets).where(eq(employeeAssets.id, id)).limit(1);
        return rows[0] ?? null;
    }

    async create(data: NewEmployeeAsset): Promise<EmployeeAsset> {
        const cleanData = stripUndefined(data);
        const rows = await this.db.insert(employeeAssets).values(cleanData as any).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewEmployeeAsset>): Promise<EmployeeAsset> {
        const cleanData = stripUndefined(data);
        const rows = await this.db
            .update(employeeAssets)
            .set({ ...cleanData, updatedAt: new Date() })
            .where(eq(employeeAssets.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Asset with ID ${id} not found`);
        }

        return rows[0];
    }

    async delete(id: number): Promise<void> {
        await this.db.delete(employeeAssets).where(eq(employeeAssets.id, id));
    }
}
