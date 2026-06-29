import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    circulars,
    type Circular,
    type NewCircular,
} from '@db/schemas/master/circulars.schema';

@Injectable()
export class CircularsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<Circular[]> {
        return this.db.select().from(circulars);
    }

    async findById(id: number): Promise<Circular | null> {
        const result = await this.db
            .select()
            .from(circulars)
            .where(eq(circulars.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewCircular): Promise<Circular> {
        const rows = await this.db
            .insert(circulars)
            .values(data)
            .returning();
        return rows[0];
    }

    async update(
        id: number,
        data: Partial<NewCircular>,
    ): Promise<Circular> {
        const rows = await this.db
            .update(circulars)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(circulars.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Circular with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(circulars)
            .where(eq(circulars.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Circular with ID ${id} not found`);
        }
    }
}
