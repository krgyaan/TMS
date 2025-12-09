import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    designations,
    type Designation,
    type NewDesignation,
} from '@db/schemas/master/designations.schema';

@Injectable()
export class DesignationsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<Designation[]> {
        return this.db.select().from(designations);
    }

    async findById(id: number): Promise<Designation | null> {
        const result = await this.db
            .select()
            .from(designations)
            .where(eq(designations.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewDesignation): Promise<Designation> {
        const rows = await this.db
            .insert(designations)
            .values(data)
            .returning();
        return rows[0];
    }

    async update(
        id: number,
        data: Partial<NewDesignation>,
    ): Promise<Designation> {
        const rows = await this.db
            .update(designations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(designations.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Designation with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(designations)
            .where(eq(designations.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Designation with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<Designation[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(designations)
            .where(like(designations.name, searchPattern));
    }
}
