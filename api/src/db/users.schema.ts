import {
  pgTable,
  bigserial,
  varchar,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    username: varchar('username', { length: 100 }).unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    mobile: varchar('mobile', { length: 20 }),
    password: varchar('password', { length: 255 }).notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    rememberToken: varchar('remember_token', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    mobileIdx: index('users_mobile_idx').on(table.mobile),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
