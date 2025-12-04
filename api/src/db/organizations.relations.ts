import { relations } from 'drizzle-orm';
import { organizations } from './organizations.schema';
import { industries } from './industries.schema';
import { tenderInfos } from './tenders.schema';
import { projects } from './projects.schema';

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  industry: one(industries, {
    fields: [organizations.industryId],
    references: [industries.id],
  }),
  tenderInfos: many(tenderInfos),
  projects: many(projects),
}));
