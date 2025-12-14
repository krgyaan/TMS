import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { TestDatabase } from './setup/test-db';
import type { DbInstance } from '@db';
import { sql } from 'drizzle-orm';

// Load environment variables from .env file if it exists
// Try multiple common locations
const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.test'),
    resolve(process.cwd(), '..', '.env'),
];

for (const envPath of envPaths) {
    if (existsSync(envPath)) {
        config({ path: envPath });
        break; // Use first found .env file
    }
}

/**
 * Master Data Validation Test
 *
 * This test validates that all required master data tables have been populated.
 * If master data is missing, it provides clear instructions to run the migration script.
 */
describe('Master Data Validation (e2e)', () => {
    let testDb: TestDatabase;
    let db: DbInstance;

    beforeAll(async () => {
        // Check if DATABASE_URL is set
        if (!process.env.DATABASE_URL) {
            throw new Error(
                'DATABASE_URL environment variable is required for tests.\n' +
                'Please set DATABASE_URL in your environment or create a .env file with:\n' +
                '  DATABASE_URL=postgresql://user:password@localhost:5432/database_name'
            );
        }

        testDb = new TestDatabase();
        const { db: dbInstance } = await testDb.init();
        db = dbInstance;
    });

    afterAll(async () => {
        await testDb.close();
    });

    /**
     * Helper function to check if a master data table has records
     */
    async function checkMasterDataTable(tableName: string): Promise<{ exists: boolean; count: number }> {
        try {
            // Use sql template literal for safe query execution
            // Cast COUNT result to integer for consistent parsing
            const result = await db.execute(sql.raw(`SELECT COUNT(*)::int as count FROM ${tableName}`));

            // Drizzle with node-postgres returns results in pg format
            // Result structure: { rows: [{ count: '123' }], ... }
            const rows = (result as any)?.rows || [];
            const count = rows.length > 0 ? parseInt(String(rows[0]?.count || '0'), 10) : 0;

            return { exists: count > 0, count };
        } catch (error: any) {
            // If table doesn't exist, return exists: false
            const errorCode = error?.code || error?.cause?.code;
            if (errorCode === '42P01') {
                return { exists: false, count: 0 };
            }
            throw error;
        }
    }

    it('should have all master data tables populated', async () => {
        // Define all master data tables to check
        const masterDataTables = [
            { name: 'statuses', description: 'Tender statuses' },
            { name: 'websites', description: 'Tender websites' },
            { name: 'items', description: 'Tender items' },
            { name: 'locations', description: 'Tender locations' },
            { name: 'organizations', description: 'Client organizations' },
            { name: 'teams', description: 'Teams (required for items)' },
            { name: 'item_headings', description: 'Item headings (required for items)' },
            { name: 'industries', description: 'Industries (required for organizations)' },
        ];

        const missingTables: Array<{ name: string; description: string; count: number }> = [];

        // Check each master data table
        for (const table of masterDataTables) {
            const { exists, count } = await checkMasterDataTable(table.name);
            if (!exists) {
                missingTables.push({ name: table.name, description: table.description, count });
            }
        }

        // If any master data is missing, log error and fail test
        if (missingTables.length > 0) {
            const errorMessage = [
                '',
                '❌ Master data validation failed!',
                '',
                'Missing data in the following tables:',
                ...missingTables.map((t) => `  - ${t.name} (${t.count} records) - ${t.description}`),
                '',
                'To populate master data, run:',
                '  npm run migrate-masters',
                '  OR',
                '  ts-node api/scripts/migrate-masters.ts',
                '',
                'Migration script location: api/scripts/migrate-masters.ts',
                '',
            ].join('\n');

            console.error(errorMessage);
            throw new Error(
                `Master data validation failed. ${missingTables.length} table(s) are empty. See error log above for details.`
            );
        }

        // All master data exists - test passes
        console.log('✅ All master data tables are populated.');
    });
});
