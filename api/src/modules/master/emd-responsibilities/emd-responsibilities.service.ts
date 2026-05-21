import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, ilike, like } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { emdResponsibility, type EmdResponsibility, type NewEmdResponsibility } from "@db/schemas/master/emd-responsibilities";

@Injectable()
export class EmdResponsibilityService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<EmdResponsibility[]> {
        console.log("Fetching all EMD Responsibilities");
        return this.db.select().from(emdResponsibility);
    }

    async findById(id: number): Promise<EmdResponsibility | null> {
        const result = await this.db.select().from(emdResponsibility).where(eq(emdResponsibility.id, id)).limit(1);
        return result[0] ?? null;
    }

    async create(data: NewEmdResponsibility): Promise<EmdResponsibility> {
        const rows = await this.db.insert(emdResponsibility).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewEmdResponsibility>): Promise<EmdResponsibility> {
        const rows = await this.db
            .update(emdResponsibility)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(emdResponsibility.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`EMD Responsibility with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(emdResponsibility).where(eq(emdResponsibility.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`EMD Responsibility with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<EmdResponsibility[]> {
        const searchPattern = `%${query}%`;
        return this.db.select().from(emdResponsibility).where(ilike(emdResponsibility.name, searchPattern));
    }
}
