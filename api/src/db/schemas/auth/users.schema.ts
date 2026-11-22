import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    timestamp,
    boolean,
    index,
    integer,
} from 'drizzle-orm/pg-core';
import { teams } from '../master/teams.schema';
import { tallyLedgers } from '../integrations/tally-ledgers.schema';
import { roles } from './roles.schema';

export const users = pgTable(
    'users',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        name: varchar('name', { length: 255 }).notNull(),
        username: varchar('username', { length: 100 }).unique(),
        email: varchar('email', { length: 255 }).notNull().unique(),
        mobile: varchar('mobile', { length: 20 }),
        password: varchar('password', { length: 255 }).notNull(),
        team: integer('team').references(() => teams.id),
        primaryTeamId: bigint('primary_team_id', { mode: 'number' }),
        roleId: bigint('role_id', { mode: 'number' }).references(() => roles.id),
        emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
        lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
        isActive: boolean('is_active').notNull().default(true),
        imprestLedgerId: bigint('imprest_ledger_id', { mode: 'number' }).references(() => tallyLedgers.id, {
            onDelete: 'set null',
        }),
        salaryLedgerId: bigint('salary_ledger_id', { mode: 'number' }).references(() => tallyLedgers.id, {
            onDelete: 'set null',
        }),
        salaryPayableLedgerId: bigint('salary_payable_ledger_id', { mode: 'number' }).references(() => tallyLedgers.id, {
            onDelete: 'set null',
        }),
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
        imprestLedgerIdx: index('users_imprest_ledger_idx').on(table.imprestLedgerId),
        salaryLedgerIdx: index('users_salary_ledger_idx').on(table.salaryLedgerId),
        salaryPayableLedgerIdx: index('users_salary_payable_ledger_idx').on(table.salaryPayableLedgerId),
    }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
