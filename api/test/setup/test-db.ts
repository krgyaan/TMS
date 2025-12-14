import { Pool } from 'pg';
import { createPool, createDb, type DbInstance } from '@db';
import { DRIZZLE, DB_POOL } from '@db/database.module';

/**
 * Test database utilities
 * Provides database connection and cleanup helpers for e2e tests
 */
export class TestDatabase {
    private pool: Pool | null = null;
    private db: DbInstance | null = null;

    /**
     * Initialize test database connection
     */
    async init(): Promise<{ pool: Pool; db: DbInstance }> {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error('DATABASE_URL environment variable is required for tests');
        }

        this.pool = createPool(dbUrl, 5, false);
        this.db = createDb(this.pool);

        return { pool: this.pool, db: this.db };
    }

    /**
     * Get database instance
     */
    getDb(): DbInstance {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }

    /**
     * Get pool instance
     */
    getPool(): Pool {
        if (!this.pool) {
            throw new Error('Database pool not initialized. Call init() first.');
        }
        return this.pool;
    }

    /**
     * Close database connections
     */
    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.db = null;
        }
    }

    /**
     * Clean up test data from tables
     * Deletes in reverse order of dependencies
     */
    async cleanup(tables: string[]): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // Delete in reverse dependency order
        for (const table of tables.reverse()) {
            await this.db.execute(`DELETE FROM ${table}`);
        }
    }

    /**
     * Execute raw SQL query
     */
    async execute(sql: string): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        await this.db.execute(sql);
    }
}

/**
 * Get database providers for NestJS testing module
 */
export function getTestDatabaseProviders() {
    return [
        {
            provide: DB_POOL,
            useFactory: () => {
                const dbUrl = process.env.DATABASE_URL;
                if (!dbUrl) {
                    throw new Error('DATABASE_URL environment variable is required for tests');
                }
                return createPool(dbUrl, 5, false);
            },
        },
        {
            provide: DRIZZLE,
            inject: [DB_POOL],
            useFactory: (pool: Pool) => createDb(pool),
        },
    ];
}
