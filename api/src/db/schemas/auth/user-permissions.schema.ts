import {
    pgTable,
    bigserial,
    bigint,
    boolean,
    timestamp,
    uniqueIndex,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '@db/schemas/auth/users.schema';
import { permissions } from '@db/schemas/auth/permissions.schema';

/**
 * User-level permission overrides
 * - granted: true = explicitly grant (override role denial)
 * - granted: false = explicitly deny (override role grant)
 */
export const userPermissions = pgTable(
    'user_permissions',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        userId: bigint('user_id', { mode: 'number' })
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        permissionId: bigint('permission_id', { mode: 'number' })
            .notNull()
            .references(() => permissions.id, { onDelete: 'cascade' }),
        // true = grant, false = deny (override)
        granted: boolean('granted').notNull().default(true),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        userPermissionIdx: uniqueIndex('user_permissions_unique_idx').on(
            table.userId,
            table.permissionId
        ),
        userIdx: index('user_permissions_user_idx').on(table.userId),
    })
);

export type UserPermission = typeof userPermissions.$inferSelect;
export type NewUserPermission = typeof userPermissions.$inferInsert;
