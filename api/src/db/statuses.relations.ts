import { relations } from 'drizzle-orm';
import { statuses } from './statuses.schema';
import { tenderInfos } from './tenders.schema';
import { tenderStatusHistory } from './tender-status-history.schema';

export const statusesRelations = relations(statuses, ({ many }) => ({
  tenderInfos: many(tenderInfos),
  tenderStatusHistoryAsPrevStatus: many(tenderStatusHistory, {
    relationName: 'prevStatus',
  }),
  tenderStatusHistoryAsNewStatus: many(tenderStatusHistory, {
    relationName: 'newStatus',
  }),
}));
