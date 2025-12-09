import { relations } from 'drizzle-orm';
import { states } from '@db/schemas/master/states.schema';

export const statesRelations = relations(states, () => ({}));
