import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    industries,
    type Industry,
    type NewIndustry,
} from '../../../db/industries.schema';

@Injectable()
export class IndustriesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<Industry[]> {
        return this.db.select().from(industries);
    }

    async findById(id: number): Promise<Industry | null> {
        const result = await this.db
            .select()
            .from(industries)
            .where(eq(industries.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewIndustry): Promise<Industry> {
        const rows = await this.db.insert(industries).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewIndustry>): Promise<Industry> {
        const rows = await this.db
            .update(industries)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(industries.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Industry with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(industries)
            .where(eq(industries.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Industry with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<Industry[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(industries)
            .where(like(industries.name, searchPattern));
    }
}
