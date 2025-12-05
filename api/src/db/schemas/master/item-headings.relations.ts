import { relations } from 'drizzle-orm';
import { itemHeadings } from '@db/schemas/master/item-headings.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { items } from '@db/schemas/master/items.schema';

export const itemHeadingsRelations = relations(itemHeadings, ({ one, many }) => ({
  team: one(teams, {
    fields: [itemHeadings.teamId],
    references: [teams.id],
  }),
  items: many(items),
}));
