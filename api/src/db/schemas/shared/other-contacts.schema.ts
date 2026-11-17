import { pgTable, bigserial, bigint, varchar, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Contacts that are not tied to a tender or a project — e.g. added from the BI
 * dashboard BG form when no tender/project was selected. `purpose` tags the
 * originating feature (currently 'BG') so other pages can reuse this table.
 */
export const otherContacts = pgTable('other_contacts', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    designation: varchar('designation', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    purpose: varchar('purpose', { length: 255 }),
    createdBy: bigint('created_by', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
}, (table) => [
    index('idx_other_contacts_purpose').on(table.purpose),
]);

export type OtherContact = typeof otherContacts.$inferSelect;
export type NewOtherContact = typeof otherContacts.$inferInsert;
