import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    bigint,
    date,
    integer,
    timestamp,
} from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    teamName: varchar('team_name', { length: 255 }).notNull(),
    tenderId: integer('tender_id'),
    organisationId: bigint('organisation_id', { mode: 'number' }).notNull(),
    itemId: bigint('item_id', { mode: 'number' }).notNull(),
    locationId: bigint('location_id', { mode: 'number' }).notNull(),
    poNo: varchar('po_no', { length: 255 }),
    projectCode: varchar('project_code', { length: 255 }),
    projectName: varchar('project_name', { length: 255 }),
    poUpload: varchar('po_upload', { length: 255 }),
    poDate: date('po_date'),
    sapPoDate: date('sap_po_date'),
    sapPoNo: varchar('sap_po_no', { length: 255 }),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
