import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { states, type State, type NewState } from '@db/schemas/master/states.schema';

@Injectable()
export class StatesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<State[]> {
        return this.db.select().from(states);
    }

    async findById(id: number): Promise<State | null> {
        const result = await this.db
            .select()
            .from(states)
            .where(eq(states.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewState): Promise<State> {
        const rows = await this.db.insert(states).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewState>): Promise<State> {
        const rows = await this.db
            .update(states)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(states.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`State with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(states)
            .where(eq(states.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`State with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<State[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(states)
            .where(like(states.name, searchPattern));
    }
}
