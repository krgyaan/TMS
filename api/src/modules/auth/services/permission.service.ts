import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { permissions } from '@db/schemas/auth/permissions.schema';
import { rolePermissions } from '@db/schemas/auth/role-permissions.schema';
import { userPermissions } from '@db/schemas/auth/user-permissions.schema';
import { DataScope, RoleName } from '@/common/constants/roles.constant';

export type PermissionCheck = {
    module: string;
    action: string;
};

export type UserPermissionContext = {
    userId: number;
    roleId: number | null;
    roleName: string | null;
    teamId: number | null;
    dataScope: DataScope;
};

// Cache structure for permissions
type PermissionCache = {
    rolePermissions: Map<number, Set<string>>; // roleId -> Set<"module:action">
    userOverrides: Map<number, Map<string, boolean>>; // userId -> Map<"module:action", granted>
    lastUpdated: number;
};

@Injectable()
export class PermissionService implements OnModuleInit {
    private cache: PermissionCache = {
        rolePermissions: new Map(),
        userOverrides: new Map(),
        lastUpdated: 0,
    };

    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async onModuleInit() {
        await this.refreshCache();
    }

    /**
     * Check if user has permission for a specific action on a module
     */
    async hasPermission(
        context: UserPermissionContext,
        check: PermissionCheck
    ): Promise<boolean> {
        // Super User and Admin have all permissions
        if (
            context.roleName === RoleName.SUPER_USER ||
            context.roleName === RoleName.ADMIN
        ) {
            return true;
        }

        await this.ensureCacheValid();

        const permKey = `${check.module}:${check.action}`;

        // 1. Check user-level override first
        const userOverrides = this.cache.userOverrides.get(context.userId);
        if (userOverrides?.has(permKey)) {
            return userOverrides.get(permKey)!;
        }

        // 2. Check role permissions
        if (context.roleId) {
            const rolePerms = this.cache.rolePermissions.get(context.roleId);
            if (rolePerms?.has(permKey)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check multiple permissions at once
     */
    async hasAnyPermission(
        context: UserPermissionContext,
        checks: PermissionCheck[]
    ): Promise<boolean> {
        for (const check of checks) {
            if (await this.hasPermission(context, check)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user can perform action on resource based on ownership/team
     */
    canAccessResource(
        context: UserPermissionContext,
        resource: {
            ownerId?: number | null;
            teamId?: number | null;
            createdById?: number | null;
        }
    ): boolean {
        // ALL scope can access everything
        if (context.dataScope === DataScope.ALL) {
            return true;
        }

        // TEAM scope can access team resources
        if (context.dataScope === DataScope.TEAM) {
            if (context.teamId && resource.teamId === context.teamId) {
                return true;
            }
            // Also allow if user owns the resource
            if (
                resource.ownerId === context.userId ||
                resource.createdById === context.userId
            ) {
                return true;
            }
        }

        // SELF scope can only access own resources
        if (context.dataScope === DataScope.SELF) {
            return (
                resource.ownerId === context.userId ||
                resource.createdById === context.userId
            );
        }

        return false;
    }

    /**
     * Get all permissions for a user (for frontend)
     */
    async getUserPermissions(userId: number, roleId: number | null): Promise<string[]> {
        await this.ensureCacheValid();

        const perms = new Set<string>();

        // Add role permissions
        if (roleId) {
            const rolePerms = this.cache.rolePermissions.get(roleId);
            if (rolePerms) {
                rolePerms.forEach((p) => perms.add(p));
            }
        }

        // Apply user overrides
        const userOverrides = this.cache.userOverrides.get(userId);
        if (userOverrides) {
            userOverrides.forEach((granted, perm) => {
                if (granted) {
                    perms.add(perm);
                } else {
                    perms.delete(perm);
                }
            });
        }

        return Array.from(perms);
    }

    /**
     * Grant permission to user (override)
     */
    async grantUserPermission(
        userId: number,
        module: string,
        action: string
    ): Promise<void> {
        const perm = await this.getOrCreatePermission(module, action);

        await this.db
            .insert(userPermissions)
            .values({
                userId,
                permissionId: perm.id,
                granted: true,
            })
            .onConflictDoUpdate({
                target: [userPermissions.userId, userPermissions.permissionId],
                set: { granted: true, updatedAt: new Date() },
            });

        await this.refreshUserOverrides(userId);
    }

    /**
     * Revoke permission from user (override)
     */
    async revokeUserPermission(
        userId: number,
        module: string,
        action: string
    ): Promise<void> {
        const perm = await this.getOrCreatePermission(module, action);

        await this.db
            .insert(userPermissions)
            .values({
                userId,
                permissionId: perm.id,
                granted: false,
            })
            .onConflictDoUpdate({
                target: [userPermissions.userId, userPermissions.permissionId],
                set: { granted: false, updatedAt: new Date() },
            });

        await this.refreshUserOverrides(userId);
    }

    /**
     * Remove user permission override (revert to role default)
     */
    async removeUserPermissionOverride(
        userId: number,
        module: string,
        action: string
    ): Promise<void> {
        const [perm] = await this.db
            .select()
            .from(permissions)
            .where(and(eq(permissions.module, module), eq(permissions.action, action)))
            .limit(1);

        if (perm) {
            await this.db
                .delete(userPermissions)
                .where(
                    and(
                        eq(userPermissions.userId, userId),
                        eq(userPermissions.permissionId, perm.id)
                    )
                );
        }

        await this.refreshUserOverrides(userId);
    }

    /**
     * Assign permissions to role
     */
    async setRolePermissions(
        roleId: number,
        permissionIds: number[]
    ): Promise<void> {
        // Remove existing
        await this.db
            .delete(rolePermissions)
            .where(eq(rolePermissions.roleId, roleId));

        // Add new
        if (permissionIds.length > 0) {
            await this.db.insert(rolePermissions).values(
                permissionIds.map((permissionId) => ({
                    roleId,
                    permissionId,
                }))
            );
        }

        await this.refreshRolePermissions(roleId);
    }

    /**
     * Get all available permissions
     */
    async getAllPermissions() {
        return this.db.select().from(permissions).orderBy(permissions.module);
    }

    // ==================== Private Methods ====================

    private async getOrCreatePermission(module: string, action: string) {
        const [existing] = await this.db
            .select()
            .from(permissions)
            .where(and(eq(permissions.module, module), eq(permissions.action, action)))
            .limit(1);

        if (existing) return existing;

        const [created] = await this.db
            .insert(permissions)
            .values({ module, action })
            .returning();

        return created;
    }

    private async ensureCacheValid() {
        if (Date.now() - this.cache.lastUpdated > this.CACHE_TTL) {
            await this.refreshCache();
        }
    }

    async refreshCache() {
        await Promise.all([
            this.refreshAllRolePermissions(),
            this.refreshAllUserOverrides(),
        ]);
        this.cache.lastUpdated = Date.now();
    }

    private async refreshAllRolePermissions() {
        const rows = await this.db
            .select({
                roleId: rolePermissions.roleId,
                module: permissions.module,
                action: permissions.action,
            })
            .from(rolePermissions)
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId));

        this.cache.rolePermissions.clear();

        for (const row of rows) {
            if (!this.cache.rolePermissions.has(row.roleId)) {
                this.cache.rolePermissions.set(row.roleId, new Set());
            }
            this.cache.rolePermissions.get(row.roleId)!.add(`${row.module}:${row.action}`);
        }
    }

    private async refreshRolePermissions(roleId: number) {
        const rows = await this.db
            .select({
                module: permissions.module,
                action: permissions.action,
            })
            .from(rolePermissions)
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
            .where(eq(rolePermissions.roleId, roleId));

        const perms = new Set<string>();
        for (const row of rows) {
            perms.add(`${row.module}:${row.action}`);
        }
        this.cache.rolePermissions.set(roleId, perms);
    }

    private async refreshAllUserOverrides() {
        const rows = await this.db
            .select({
                userId: userPermissions.userId,
                module: permissions.module,
                action: permissions.action,
                granted: userPermissions.granted,
            })
            .from(userPermissions)
            .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId));

        this.cache.userOverrides.clear();

        for (const row of rows) {
            if (!this.cache.userOverrides.has(row.userId)) {
                this.cache.userOverrides.set(row.userId, new Map());
            }
            this.cache.userOverrides
                .get(row.userId)!
                .set(`${row.module}:${row.action}`, row.granted);
        }
    }

    private async refreshUserOverrides(userId: number) {
        const rows = await this.db
            .select({
                module: permissions.module,
                action: permissions.action,
                granted: userPermissions.granted,
            })
            .from(userPermissions)
            .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
            .where(eq(userPermissions.userId, userId));

        const overrides = new Map<string, boolean>();
        for (const row of rows) {
            overrides.set(`${row.module}:${row.action}`, row.granted);
        }
        this.cache.userOverrides.set(userId, overrides);
    }
}
