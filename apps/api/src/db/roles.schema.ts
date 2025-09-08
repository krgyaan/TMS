import { pgTable, bigserial, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const roles = pgTable(
  'roles',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    guardName: varchar('guard_name', { length: 50 }).notNull().default('web'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameGuardIdx: uniqueIndex('roles_name_guard_index').on(table.name, table.guardName),
  }),
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
