import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { broadcasts } from '@db/schemas/crm/broadcasts.schema';
import type { CreateBroadcastDto, UpdateBroadcastDto } from './dto/broadcast.dto';

@Injectable()
export class BroadcastsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll() {
        return this.db
            .select()
            .from(broadcasts)
            .orderBy(asc(broadcasts.name));
    }

    async findById(id: number) {
        const [row] = await this.db
            .select()
            .from(broadcasts)
            .where(eq(broadcasts.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Broadcast with ID ${id} not found`);
        }

        return row;
    }

    async create(data: CreateBroadcastDto) {
        const [inserted] = await this.db
            .insert(broadcasts)
            .values({ name: data.name })
            .returning({ id: broadcasts.id });

        return this.findById(inserted.id);
    }

    async update(id: number, data: UpdateBroadcastDto) {
        const [existing] = await this.db
            .select()
            .from(broadcasts)
            .where(eq(broadcasts.id, id))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(`Broadcast with ID ${id} not found`);
        }

        const updateValues: Record<string, unknown> = { updatedAt: new Date() };
        if (data.name !== undefined) updateValues.name = data.name;

        await this.db
            .update(broadcasts)
            .set(updateValues)
            .where(eq(broadcasts.id, id));

        return this.findById(id);
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(broadcasts)
            .where(eq(broadcasts.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`Broadcast with ID ${id} not found`);
        }
    }
}