import { relations } from 'drizzle-orm';
import { tqTypes } from './tq-types.schema';

export const tqTypesRelations = relations(tqTypes, () => ({}));
