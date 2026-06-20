import { relations } from 'drizzle-orm';
import { tenderCostingDetails } from './tender-costing-details.schema';
import { tenderCostingSheets } from './tender-costing-sheets.schema';

export const tenderCostingDetailsRelations = relations(tenderCostingDetails, ({ one }) => ({
    costingSheet: one(tenderCostingSheets, {
        fields: [tenderCostingDetails.tenderCostingSheetId],
        references: [tenderCostingSheets.id],
    }),
}));
