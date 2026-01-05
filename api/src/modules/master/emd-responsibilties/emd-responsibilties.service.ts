import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { emdResponsibilityTypes, type EmdResponsibilityType, type NewEmdResponsibilityType } from "@db/schemas/master/emd-responsibilities";

@Injectable()
export class EmdResponsibilityService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<EmdResponsibilityType[]> {
        console.log("Fetching all EMD Responsibilities");
        return this.db.select().from(emdResponsibilityTypes);
    }

    async findById(id: number): Promise<EmdResponsibilityType | null> {
        const result = await this.db.select().from(emdResponsibilityTypes).where(eq(emdResponsibilityTypes.id, id)).limit(1);
        return result[0] ?? null;
    }

    async create(data: NewEmdResponsibilityType): Promise<EmdResponsibilityType> {
        const rows = await this.db.insert(emdResponsibilityTypes).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewEmdResponsibilityType>): Promise<EmdResponsibilityType> {
        const rows = await this.db
            .update(emdResponsibilityTypes)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(emdResponsibilityTypes.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`EMD Responsibility with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(emdResponsibilityTypes).where(eq(emdResponsibilityTypes.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`EMD Responsibility with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<EmdResponsibilityType[]> {
        const searchPattern = `%${query}%`;
        return this.db.select().from(emdResponsibilityTypes).where(like(emdResponsibilityTypes.name, searchPattern));
    }
}
