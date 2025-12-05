import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    date,
    timestamp,
} from 'drizzle-orm/pg-core';
import { users } from '@db/schemas/auth/users.schema';
import { designations } from '@db/schemas/master/designations.schema';
import { teams } from '@db/schemas/master/teams.schema';

export const userProfiles = pgTable('user_profiles', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 255 }),
    lastName: varchar('last_name', { length: 255 }),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 20 }),
    employeeCode: varchar('employee_code', { length: 50 }).unique(),
    designationId: bigint('designation_id', { mode: 'number' }).references(
        () => designations.id,
    ),
    primaryTeamId: bigint('primary_team_id', { mode: 'number' }).references(
        () => teams.id,
    ),
    altEmail: varchar('alt_email', { length: 255 }),
    emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
    emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
    image: varchar('image', { length: 255 }),
    signature: varchar('signature', { length: 255 }),
    dateOfJoining: date('date_of_joining'),
    dateOfExit: date('date_of_exit'),
    timezone: varchar('timezone', { length: 50 })
        .notNull()
        .default('Asia/Kolkata'),
    locale: varchar('locale', { length: 10 }).notNull().default('en'),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
