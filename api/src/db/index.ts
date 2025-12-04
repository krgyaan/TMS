import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const createPool = (url: string, max?: number, ssl?: boolean) =>
    new Pool({
        connectionString: url,
        max,
        ssl: ssl ? { rejectUnauthorized: false } : undefined,
    });

export const createDb = (pool: Pool) => drizzle(pool, {
    schema,
    logger: {
        logQuery: (query: string, params: unknown[]) => {
            console.log('[Drizzle SQL] Query:', query);
            console.log('[Drizzle SQL] Params:', params);
        },
    },
});

export type DbInstance = NodePgDatabase<typeof schema>;
