import { relations } from 'drizzle-orm';
import { physicalDocs, physicalDocsPersons } from './physical-docs.schema';

export const physicalDocsRelations = relations(physicalDocs, ({ many }) => ({
  physicalDocsPersons: many(physicalDocsPersons),
}));

export const physicalDocsPersonsRelations = relations(physicalDocsPersons, ({ one }) => ({
  physicalDoc: one(physicalDocs, {
    fields: [physicalDocsPersons.physicalDocId],
    references: [physicalDocs.id],
  }),
}));
