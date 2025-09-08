import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const createPool = (url: string, max?: number, ssl?: boolean) =>
  new Pool({ connectionString: url, max, ssl: ssl ? { rejectUnauthorized: false } : undefined });

export const createDb = (pool: Pool) => drizzle(pool);

export type DbInstance = NodePgDatabase;

