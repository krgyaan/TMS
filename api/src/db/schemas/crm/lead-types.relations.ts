import { relations } from 'drizzle-orm';
import { leadTypes } from '@db/schemas/crm/lead-types.schema';

export const leadTypesRelations = relations(leadTypes, () => ({}));
