import {
    pgTable,
    bigserial,
    bigint,
    timestamp,
    uniqueIndex,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '@db/schemas/auth/users.schema';
import { roles } from '@db/schemas/auth/roles.schema';
import { relations } from 'drizzle-orm';

export const userRoles = pgTable(
    'user_roles',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        userId: bigint('user_id', { mode: 'number' })
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        roleId: bigint('role_id', { mode: 'number' })
            .notNull()
            .references(() => roles.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        // Each user can have only one role
        userUniqueIdx: uniqueIndex('user_roles_user_id_unique').on(table.userId),
        // For querying users by role
        roleIdx: index('user_roles_role_id_idx').on(table.roleId),
    }),
);

// Relations for Drizzle ORM
export const userRolesRelations = relations(userRoles, ({ one }) => ({
    user: one(users, {
        fields: [userRoles.userId],
        references: [users.id],
    }),
    role: one(roles, {
        fields: [userRoles.roleId],
        references: [roles.id],
    }),
}));

export type UserRoleRecord = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
