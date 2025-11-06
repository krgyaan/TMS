import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { roles, type Role, type NewRole } from '../../../db/roles.schema';

@Injectable()
export class RolesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<Role[]> {
        return this.db.select().from(roles);
    }

    async findById(id: number): Promise<Role | null> {
        const result = await this.db
            .select()
            .from(roles)
            .where(eq(roles.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewRole): Promise<Role> {
        const rows = await this.db.insert(roles).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewRole>): Promise<Role> {
        const rows = await this.db
            .update(roles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(roles.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(roles)
            .where(eq(roles.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<Role[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(roles)
            .where(like(roles.name, searchPattern));
    }
}
