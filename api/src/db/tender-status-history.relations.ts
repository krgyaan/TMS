import { relations } from 'drizzle-orm';
import { tenderStatusHistory } from './tender-status-history.schema';
import { tenderInfos } from './tenders.schema';
import { statuses } from './statuses.schema';
import { users } from './users.schema';

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
