import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    tqTypes,
    type TqType,
    type NewTqType,
} from '../../../db/tq-types.schema';

@Injectable()
export class TqTypesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<TqType[]> {
        return this.db.select().from(tqTypes);
    }

    async findById(id: number): Promise<TqType | null> {
        const result = await this.db
            .select()
            .from(tqTypes)
            .where(eq(tqTypes.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewTqType): Promise<TqType> {
        const rows = await this.db.insert(tqTypes).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewTqType>): Promise<TqType> {
        const rows = await this.db
            .update(tqTypes)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(tqTypes.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`TQ Type with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(tqTypes)
            .where(eq(tqTypes.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`TQ Type with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<TqType[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(tqTypes)
            .where(like(tqTypes.name, searchPattern));
    }
}
