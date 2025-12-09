import { relations } from 'drizzle-orm';
import { followupCategories } from '@db/schemas/crm/followup-categories.schema';

export const followupCategoriesRelations = relations(followupCategories, () => ({}));
