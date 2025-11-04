import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { teams, type Team, type NewTeam } from '../../../db/teams.schema';

@Injectable()
export class TeamsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<Team[]> {
        return this.db.select().from(teams);
    }

    async findById(id: number): Promise<Team | null> {
        const result = await this.db
            .select()
            .from(teams)
            .where(eq(teams.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewTeam): Promise<Team> {
        const rows = await this.db.insert(teams).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewTeam>): Promise<Team> {
        const rows = await this.db
            .update(teams)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(teams.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Team with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(teams)
            .where(eq(teams.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Team with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<Team[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(teams)
            .where(like(teams.name, searchPattern));
    }
}
