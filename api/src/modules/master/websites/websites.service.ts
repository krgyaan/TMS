import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    websites,
    type Website,
    type NewWebsite,
} from '@db/schemas/master/websites.schema';

@Injectable()
export class WebsitesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<Website[]> {
        return this.db.select().from(websites);
    }

    async findById(id: number): Promise<Website | null> {
        const result = await this.db
            .select()
            .from(websites)
            .where(eq(websites.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewWebsite): Promise<Website> {
        const rows = await this.db.insert(websites).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewWebsite>): Promise<Website> {
        const rows = await this.db
            .update(websites)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(websites.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Website with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(websites)
            .where(eq(websites.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Website with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<Website[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(websites)
            .where(like(websites.name, searchPattern));
    }
}
