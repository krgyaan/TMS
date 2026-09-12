import 'dotenv/config';
import * as path from 'path';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const TEMP_DB_NAME = 'tms_migration_diag_clean';

async function runCleanDiagnostic() {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) {
        console.error('DATABASE_URL is not set.');
        process.exit(1);
    }

    // Connect to administrative 'postgres' database to create/drop temporary DB
    const parsedUrl = new URL(rawUrl);
    const adminUrl = new URL(rawUrl);
    adminUrl.pathname = '/postgres';

    console.log(`[DIAGNOSTIC] Connecting to PostgreSQL server to setup throwaway DB '${TEMP_DB_NAME}'...`);
    const adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();

    try {
        await adminClient.query(`DROP DATABASE IF EXISTS "${TEMP_DB_NAME}";`);
        await adminClient.query(`CREATE DATABASE "${TEMP_DB_NAME}";`);
        console.log(`[DIAGNOSTIC] Fresh database '${TEMP_DB_NAME}' created successfully.`);
    } finally {
        await adminClient.end();
    }

    // Connect to the clean throwaway DB
    const cleanDbUrl = new URL(rawUrl);
    cleanDbUrl.pathname = `/${TEMP_DB_NAME}`;

    const cleanClient = new Client({ connectionString: cleanDbUrl.toString() });
    await cleanClient.connect();
    const db = drizzle(cleanClient);

    const migrationsFolder = path.resolve(__dirname, '../drizzle');
    console.log(`[DIAGNOSTIC] Reading migration files from: ${migrationsFolder}...`);
    const fs = await import('fs');
    const journal = JSON.parse(fs.readFileSync(path.join(migrationsFolder, 'meta/_journal.json')).toString());
    const { readMigrationFiles } = await import('drizzle-orm/migrator');
    const migrationList = readMigrationFiles({ migrationsFolder });
    console.log(`[DIAGNOSTIC] Total migration entries in journal: ${migrationList.length}`);

    let migrationSuccess = false;
    let currentTag = '';
    try {
        await cleanClient.query(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);
        await cleanClient.query(`
            CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
                id SERIAL PRIMARY KEY,
                hash text NOT NULL,
                created_at bigint
            );
        `);

        for (let i = 0; i < migrationList.length; i++) {
            const m = migrationList[i];
            const journalEntry = journal.entries[i];
            currentTag = journalEntry?.tag || `idx_${i}`;
            console.log(`[DIAGNOSTIC] Applying [${i + 1}/${migrationList.length}] tag: '${currentTag}' (when: ${m.folderMillis})...`);

            // Execute in its own transaction per migration to isolate exact failure point
            await cleanClient.query('BEGIN');
            try {
                for (const stmt of m.sql) {
                    const trimmed = stmt.trim();
                    if (trimmed) {
                        await cleanClient.query(trimmed);
                    }
                }
                await cleanClient.query(
                    `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
                    [m.hash, m.folderMillis]
                );
                await cleanClient.query('COMMIT');
            } catch (stmtErr) {
                await cleanClient.query('ROLLBACK');
                throw stmtErr;
            }
        }
        console.log(`[DIAGNOSTIC] SUCCESS: All ${migrationList.length} migrations completed end-to-end against '${TEMP_DB_NAME}'!`);
        migrationSuccess = true;
    } catch (err: any) {
        console.error(`[DIAGNOSTIC] FAILURE: Failed at migration: '${currentTag}'!`);
        console.error(`[DIAGNOSTIC] Error message:`, err.message);
        if (err.detail) console.error(`[DIAGNOSTIC] Error detail:`, err.detail);
        if (err.position) console.error(`[DIAGNOSTIC] Error position:`, err.position);
        if (err.where) console.error(`[DIAGNOSTIC] Error where:`, err.where);
        if (err.stack) console.error(`[DIAGNOSTIC] Stack:`, err.stack);
    } finally {
        await cleanClient.end();

        // Cleanup throwaway DB
        console.log(`[DIAGNOSTIC] Cleaning up throwaway database '${TEMP_DB_NAME}'...`);
        const cleanupClient = new Client({ connectionString: adminUrl.toString() });
        await cleanupClient.connect();
        try {
            await cleanupClient.query(`
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = '${TEMP_DB_NAME}' AND pid <> pg_backend_pid();
            `);
            await cleanupClient.query(`DROP DATABASE IF EXISTS "${TEMP_DB_NAME}";`);
            console.log(`[DIAGNOSTIC] Cleaned up '${TEMP_DB_NAME}'.`);
        } finally {
            await cleanupClient.end();
        }
    }

    process.exit(migrationSuccess ? 0 : 1);
}

runCleanDiagnostic().catch((e) => {
    console.error(`[DIAGNOSTIC] Unexpected runner failure:`, e);
    process.exit(1);
});
