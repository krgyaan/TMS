import { pgTable, serial, bigint, integer, varchar, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { projects } from "./projects.schema";

export const projectClosureDocuments = pgTable(
    "project_closure_documents",
    {
        id: serial("id").primaryKey(),
        projectId: bigint("project_id", { mode: "number" })
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        category: varchar("category", { length: 64 }).notNull(),
        documentName: varchar("document_name", { length: 64 }).notNull(),
        files: jsonb("files").$type<string[]>().notNull().default([]),
        uploadedBy: integer("uploaded_by").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [uniqueIndex("project_closure_documents_project_doc_idx").on(table.projectId, table.documentName)]
);

export type ProjectClosureDocument = typeof projectClosureDocuments.$inferSelect;
export type NewProjectClosureDocument = typeof projectClosureDocuments.$inferInsert;
