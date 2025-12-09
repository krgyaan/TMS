import { relations } from 'drizzle-orm';
import { statuses } from '@db/schemas/master/statuses.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { tenderStatusHistory } from '@db/schemas/tendering/tender-status-history.schema';

export const statusesRelations = relations(statuses, ({ many }) => ({
    tenderInfos: many(tenderInfos),
    tenderStatusHistoryAsPrevStatus: many(tenderStatusHistory, {
        relationName: 'prevStatus',
    }),
    tenderStatusHistoryAsNewStatus: many(tenderStatusHistory, {
        relationName: 'newStatus',
    }),
}));
