import { relations } from 'drizzle-orm';
import { tenderStatusHistory } from '@db/schemas/tendering/tender-status-history.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';

export const tenderStatusHistoryRelations = relations(tenderStatusHistory, ({ one }) => ({
    tender: one(tenderInfos, {
        fields: [tenderStatusHistory.tenderId],
        references: [tenderInfos.id],
    }),
    prevStatus: one(statuses, {
        fields: [tenderStatusHistory.prevStatus],
        references: [statuses.id],
        relationName: 'prevStatus',
    }),
    newStatus: one(statuses, {
        fields: [tenderStatusHistory.newStatus],
        references: [statuses.id],
        relationName: 'newStatus',
    }),
    changedBy: one(users, {
        fields: [tenderStatusHistory.changedBy],
        references: [users.id],
    }),
}));
