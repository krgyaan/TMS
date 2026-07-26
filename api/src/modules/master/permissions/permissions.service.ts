import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { permissions, type NewPermission, type Permission } from '@db/schemas/auth/permissions.schema';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class PermissionsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<Permission[]> {
        return this.db.select().from(permissions).orderBy(permissions.module, permissions.action);
    }

    async findById(id: number): Promise<Permission | null> {
        const result = await this.db
            .select()
            .from(permissions)
            .where(eq(permissions.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async findByModule(module: string): Promise<Permission[]> {
        return this.db
            .select()
            .from(permissions)
            .where(eq(permissions.module, module))
            .orderBy(permissions.action);
    }

    async create(data: NewPermission): Promise<Permission> {
        const rows = await this.db.insert(permissions).values(data).returning();
        return rows[0];
    }

    async bulkCreate(module: string, actions: string[], description?: string): Promise<Permission[]> {
        const values = actions.map(action => ({
            module,
            action,
            description: description || null,
        }));
        const rows = await this.db
            .insert(permissions)
            .values(values)
            .onConflictDoNothing()
            .returning();
        return rows;
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(permissions)
            .where(eq(permissions.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Permission with ID ${id} not found`);
        }
    }
}
