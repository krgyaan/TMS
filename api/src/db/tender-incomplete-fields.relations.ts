import { relations } from 'drizzle-orm';
import { tenderIncompleteFields } from './tender-incomplete-fields.schema';
import { tenderInfos } from './tenders.schema';

export const tenderIncompleteFieldsRelations = relations(tenderIncompleteFields, ({ one }) => ({
  tender: one(tenderInfos, {
    fields: [tenderIncompleteFields.tenderId],
    references: [tenderInfos.id],
  }),
}));
