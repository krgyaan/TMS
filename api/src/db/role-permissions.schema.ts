import {
    pgTable,
    bigserial,
    bigint,
    timestamp,
    uniqueIndex,
    index,
} from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';
import { permissions } from './permissions.schema';

export const rolePermissions = pgTable(
    'role_permissions',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        roleId: bigint('role_id', { mode: 'number' })
            .notNull()
            .references(() => roles.id, { onDelete: 'cascade' }),
        permissionId: bigint('permission_id', { mode: 'number' })
            .notNull()
            .references(() => permissions.id, { onDelete: 'cascade' }),
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
