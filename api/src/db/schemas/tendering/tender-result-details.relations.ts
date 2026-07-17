import { relations } from 'drizzle-orm';
import { tenderResultDetails } from './tender-result-details.schema';
import { tenderResults } from './tender-result.schema';

export const tenderResultDetailsRelations = relations(tenderResultDetails, ({ one }) => ({
    tenderResult: one(tenderResults, {
        fields: [tenderResultDetails.tenderResultId],
        references: [tenderResults.id],
    }),
}));
