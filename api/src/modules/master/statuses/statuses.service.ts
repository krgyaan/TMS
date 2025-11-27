import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    statuses,
    type NewStatus,
    type Status,
} from '../../../db/statuses.schema';

@Injectable()
export class StatusesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<Status[]> {
        return this.db.select().from(statuses);
    }

    async findById(id: number): Promise<Status> {
        const result = await this.db
            .select()
            .from(statuses)
            .where(eq(statuses.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Status with ID ${id} not found`);
        }

        return result[0];
    }

    async create(data: Pick<NewStatus, 'name' | 'tenderCategory' | 'status'>) {
        const rows = await this.db
            .insert(statuses)
            .values({
                name: data.name,
                tenderCategory: data.tenderCategory ?? 'prep',
                status: data.status ?? true,
            })
            .returning();

        return rows[0];
    }

    async update(
        id: number,
        data: Partial<Pick<NewStatus, 'name' | 'tenderCategory' | 'status'>>,
    ) {
        const rows = await this.db
            .update(statuses)
            .set({
                ...data,
                tenderCategory:
                    data.tenderCategory === undefined
                        ? 'prep'
                        : data.tenderCategory ?? 'prep',
                updatedAt: new Date(),
            })
            .where(eq(statuses.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Status with ID ${id} not found`);
        }

        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const rows = await this.db
            .update(statuses)
            .set({
                status: false,
                updatedAt: new Date(),
            })
            .where(eq(statuses.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Status with ID ${id} not found`);
        }
    }
}
