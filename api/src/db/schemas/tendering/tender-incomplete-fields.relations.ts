import { relations } from 'drizzle-orm';
import { tenderIncompleteFields } from '@db/schemas/tendering/tender-incomplete-fields.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';

export const tenderIncompleteFieldsRelations = relations(tenderIncompleteFields, ({ one }) => ({
    tender: one(tenderInfos, {
        fields: [tenderIncompleteFields.tenderId],
        references: [tenderInfos.id],
    }),
}));
