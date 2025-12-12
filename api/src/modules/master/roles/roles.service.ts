import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like, and } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { roles, type Role, type NewRole } from '@db/schemas/auth/roles.schema';
import { rolePermissions } from '@db/schemas/auth/role-permissions.schema';
import { permissions, type Permission } from '@db/schemas/auth/permissions.schema';

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

    async getRolePermissions(roleId: number): Promise<Permission[]> {
        return this.db
            .select({
                id: permissions.id,
                module: permissions.module,
                action: permissions.action,
                description: permissions.description,
                createdAt: permissions.createdAt,
                updatedAt: permissions.updatedAt,
            })
            .from(rolePermissions)
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
            .where(eq(rolePermissions.roleId, roleId));
    }

    async assignPermissions(roleId: number, permissionIds: number[]): Promise<void> {
        // Check if role exists
        const role = await this.findById(roleId);
        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        // Remove existing permissions for this role
        await this.db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

        // Insert new permissions
        if (permissionIds.length > 0) {
            await this.db.insert(rolePermissions).values(
                permissionIds.map((permissionId) => ({
                    roleId,
                    permissionId,
                })),
            );
        }
    }

    async removePermission(roleId: number, permissionId: number): Promise<void> {
        const result = await this.db
            .delete(rolePermissions)
            .where(
                and(
                    eq(rolePermissions.roleId, roleId),
                    eq(rolePermissions.permissionId, permissionId),
                ),
            )
            .returning();

        if (!result[0]) {
            throw new NotFoundException(
                `Permission ${permissionId} not found for role ${roleId}`,
            );
        }
    }
}
