import {
    pgTable,
    bigserial,
    bigint,
    timestamp,
    uniqueIndex,
    index,
} from 'drizzle-orm/pg-core';
import { roles } from '@db/schemas/auth/roles.schema';
import { permissions } from '@db/schemas/auth/permissions.schema';

export const rolePermissions = pgTable(
    'role_permissions',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        roleId: bigint('role_id', { mode: 'number' }).notNull(),
        permissionId: bigint('permission_id', { mode: 'number' }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        rolePermissionIdx: uniqueIndex('role_permissions_unique_idx').on(
            table.roleId,
            table.permissionId
        ),
        roleIdx: index('role_permissions_role_idx').on(table.roleId),
    })
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
