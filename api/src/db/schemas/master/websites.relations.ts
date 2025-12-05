import { relations } from 'drizzle-orm';
import { websites } from '@db/schemas/master/websites.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';

export const websitesRelations = relations(websites, ({ many }) => ({
    tenderInfos: many(tenderInfos),
}));
