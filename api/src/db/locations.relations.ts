import { relations } from 'drizzle-orm';
import { locations } from './locations.schema';
import { tenderInfos } from './tenders.schema';
import { projects } from './projects.schema';

export const locationsRelations = relations(locations, ({ many }) => ({
  tenderInfos: many(tenderInfos),
  projects: many(projects),
}));
