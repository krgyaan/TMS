import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '@db/schemas/auth/users.schema';

export const passwordResetOtps = pgTable(
  'password_reset_otps',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    email: varchar('email', { length: 255 }).notNull(),
    otp: varchar('otp', { length: 6 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdUsedIdx: index('password_reset_otps_user_id_used_idx').on(
      table.userId,
      table.used,
    ),
  }),
);

export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;
export type NewPasswordResetOtp = typeof passwordResetOtps.$inferInsert;
