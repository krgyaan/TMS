import { relations } from 'drizzle-orm';
import { websites } from './websites.schema';
import { tenderInfos } from './tenders.schema';

export const websitesRelations = relations(websites, ({ many }) => ({
  tenderInfos: many(tenderInfos),
}));
