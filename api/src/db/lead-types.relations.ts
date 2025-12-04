import { relations } from 'drizzle-orm';
import { leadTypes } from './lead-types.schema';

export const leadTypesRelations = relations(leadTypes, () => ({}));
