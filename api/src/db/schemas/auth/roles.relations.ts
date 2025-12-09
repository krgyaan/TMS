import { relations } from 'drizzle-orm';
import { roles } from '@db/schemas/auth/roles.schema';

export const rolesRelations = relations(roles, () => ({}));
