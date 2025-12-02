import {
    pgTable,
    bigserial,
    varchar,
    timestamp,
    uniqueIndex,
    text,
} from 'drizzle-orm/pg-core';

export const permissions = pgTable(
    'permissions',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),

        // Module identifier (e.g., 'tenders', 'users', 'emds', 'shared.imprests')
        module: varchar('module', { length: 100 }).notNull(),

        // Action (e.g., 'create', 'read', 'update', 'delete', 'approve')
        action: varchar('action', { length: 50 }).notNull(),

        // Human-readable description
        description: text('description'),

        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        moduleActionIdx: uniqueIndex('permissions_module_action_idx').on(
            table.module,
            table.action
        ),
    })
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
