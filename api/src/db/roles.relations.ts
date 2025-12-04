import { relations } from 'drizzle-orm';
import { roles } from './roles.schema';

export const rolesRelations = relations(roles, () => ({}));
