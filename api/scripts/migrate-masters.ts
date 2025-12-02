import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import {
    mysqlTable,
    varchar,
    bigint,
    text,
    timestamp,
    mysqlEnum,
} from 'drizzle-orm/mysql-core';
import { eq, sql } from 'drizzle-orm';
import { Client } from 'pg';

// ==================== Configuration ====================

const PG_URL = 'postgresql://postgres:gyan@localhost:5432/new_tms';
const MYSQL_URL = 'mysql://root:gyan@localhost:3306/mydb';

const pgClient = new Client({ connectionString: PG_URL });
pgClient.connect();
const db = pgDrizzle(pgClient);

const mysqlPool = mysql2.createPool(MYSQL_URL);
const mysqlDb = mysqlDrizzle(mysqlPool);

// ==================== MySQL Table Definitions ====================

const mysql_statuses = mysqlTable('statuses', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    tender_category: varchar('tender_category', { length: 100 }),
    status: mysqlEnum('status', ['0', '1']).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_websites = mysqlTable('websites', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 255 }),
    status: mysqlEnum('status', ['0', '1']).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_items = mysqlTable('items', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    team: mysqlEnum('team', ['AC', 'DC']).notNull(),
    heading: varchar('heading', { length: 100 }),
    status: mysqlEnum('status', ['0', '1']).notNull().default('0'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_locations = mysqlTable('locations', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    address: varchar('address', { length: 255 }).notNull(),
    acronym: varchar('acronym', { length: 255 }),
    state: varchar('state', { length: 100 }),
    region: varchar('region', { length: 20 }),
    status: mysqlEnum('status', ['0', '1']).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_organizations = mysqlTable('organizations', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    full_form: text('full_form'),
    industry: text('industry'),
    status: mysqlEnum('status', ['0', '1']).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ==================== Mappings ====================

// Team mapping: MySQL enum → PostgreSQL team_id
const TEAM_MAPPING: Record<string, number> = {
    'DC': 1,
    'dc': 1,
    'AC': 2,
    'ac': 2,
};

// Item heading mapping: MySQL heading name → PostgreSQL heading_id
const HEADING_MAPPING: Record<string, number> = {
    'Charger': 1,
    'Ni-Cd Battery': 2,
    'VRLA': 3,
    'Solar': 4,
    'UPS': 5,
    'BESS': 6,
    'Service': 7,
    'OPZs': 8,
    'VRV': 9,
    'Misc': 10,
    'Chiller & VAM': 11,
    'Unitary': 12,
    'AHU': 13,
    'Precision': 14,
    'Package-Ductable': 15,
    'FLP': 16,
    'Space Maker': 17,
    'SMF': 18,
    'Pipeline': 19,
    'DC AMC': 20,
    'DC Spares': 21,
    'Spares': 21,  // Map "Spares" to "DC Spares"
    'Installation, Testing & Commissioning': 22,
};

// Industry mapping: MySQL industry name → PostgreSQL industry_id
const INDUSTRY_MAPPING: Record<string, number> = {
    'Industry': 1,
    'Oil & Gas': 2,
    'IndianOil Institute of Petroleum Management': 3,
    'IndianOil Institute of Petroleum Management,': 3,
    'Film & Television Education': 4,
    'Biju Pattanaik Film & Television Institute of Odissa': 5,
    'Defence': 6,
    'Scientific R & D': 7,
    'Education': 8,
    'Railways': 9,
    'Law Enforcement': 10,
    'Department Of Heavy Industry': 11,
    'Urban Development / Infrastructure Industry': 12,
    'Steel Authority of India Limited': 13,
    'Agricultural Research And Development': 14,
    'Scientific & Industrial Research': 15,
    'Government Security and Currency Production': 16,
    'Paper & Forest Products': 17,
    'Manganese Ore Mining': 18,
    'research and development (R&D)': 19,
    'science popularization and museum management': 20,
    'governmental forestry and wildlife management sector': 21,
    'Energy and Renewable Energy': 22,
    'Electronics and Instrumentation': 23,
    'Municipal Administration': 24,
    'Media Regulation and Monitoring': 25,
    'Logistics': 26,
    'Power / Energy': 27,
    'Insurance': 28,
    'Environment': 29,
    'Taxation': 30,
    'Healthcare': 31,
    'Banking': 32,
    'port operations and logistics': 33,
    'Dairy Industry': 34,
    'Automotive Components': 35,
    'Consumer protection': 36,
    'Mining': 37,
    'Telecommunications': 38,
    'Mass Media And Broadcasting': 39,
    'Facility Management': 40,
    'Government-Oriented': 41,
    'Nuclear': 42,
    'Ministry of Finance': 43,
    'Electric power distribution': 44,
    'Government Audit & Accounts': 45,
    'Construction': 46,
    'Electronics development and technology': 47,
    'Hospitality and Travel and Tourism': 48,
    'Airport': 49,
    'Water Utilities': 50,
    'Publishing Industries': 52,
    'Non-IT': 0,  // No match - will be null
    'IT': 0,      // No match - will be null
};

// ==================== Helper Functions ====================

const parseDate = (val: string | Date | null | undefined): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const parseBoolean = (val: string | null | undefined): boolean => {
    if (val === null || val === undefined) return true;
    return val === '1';
};

const safeString = (val: string | null | undefined, maxLength?: number): string | null => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (str === '') return null;
    return maxLength ? str.substring(0, maxLength) : str;
};

const getIndustryId = (industryName: string | null): number | null => {
    if (!industryName) return null;
    const trimmed = industryName.trim();

    // Direct match
    if (INDUSTRY_MAPPING[trimmed] !== undefined) {
        return INDUSTRY_MAPPING[trimmed];
    }

    // Case-insensitive match
    const lowerTrimmed = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(INDUSTRY_MAPPING)) {
        if (key.toLowerCase() === lowerTrimmed) {
            return value;
        }
    }

    return null;
};

const getHeadingId = (headingName: string | null): number | null => {
    if (!headingName) return null;
    const trimmed = headingName.trim();

    // Direct match
    if (HEADING_MAPPING[trimmed] !== undefined) {
        return HEADING_MAPPING[trimmed];
    }

    // Case-insensitive match
    const lowerTrimmed = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(HEADING_MAPPING)) {
        if (key.toLowerCase() === lowerTrimmed) {
            return value;
        }
    }

    return null;
};

// ==================== Migration Functions ====================

async function migrateStatuses(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Statuses ---');

    const rows = await mysqlDb.select().from(mysql_statuses);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM statuses WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // Insert with explicit ID
            await db.execute(sql`
                INSERT INTO statuses (id, name, tender_category, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${r.name},
                    ${r.tender_category || 'prep'},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.name}`);

        } catch (error) {
            console.error(`  ❌ Error migrating status ID ${r.id}:`, error);
            errors++;
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('statuses_id_seq', COALESCE((SELECT MAX(id) FROM statuses), 1))`);
    console.log('  ✅ Fixed statuses_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateWebsites(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Websites ---');

    const rows = await mysqlDb.select().from(mysql_websites);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM websites WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // Insert with explicit ID
            await db.execute(sql`
                INSERT INTO websites (id, name, url, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${r.name},
                    ${r.url},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.name}`);

        } catch (error) {
            console.error(`  ❌ Error migrating website ID ${r.id}:`, error);
            errors++;
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('websites_id_seq', COALESCE((SELECT MAX(id) FROM websites), 1))`);
    console.log('  ✅ Fixed websites_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateItems(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Items ---');

    const rows = await mysqlDb.select().from(mysql_items);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    const unmatchedHeadings = new Set<string>();

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM items WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // Map team enum to team_id
            const teamId = TEAM_MAPPING[r.team] || null;

            // Map heading to heading_id
            const headingId = getHeadingId(r.heading);

            if (r.heading && !headingId) {
                unmatchedHeadings.add(r.heading);
            }

            // Insert with explicit ID
            await db.execute(sql`
                INSERT INTO items (id, name, team_id, heading_id, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${r.name},
                    ${teamId},
                    ${headingId},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.name} (team: ${r.team} → ${teamId}, heading: ${r.heading} → ${headingId})`);

        } catch (error) {
            console.error(`  ❌ Error migrating item ID ${r.id}:`, error);
            errors++;
        }
    }

    if (unmatchedHeadings.size > 0) {
        console.log(`\n  ⚠️ Unmatched headings (set to NULL):`);
        unmatchedHeadings.forEach(h => console.log(`     - "${h}"`));
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('items_id_seq', COALESCE((SELECT MAX(id) FROM items), 1))`);
    console.log('  ✅ Fixed items_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateLocations(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Locations ---');

    const rows = await mysqlDb.select().from(mysql_locations);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM locations WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // MySQL address → PostgreSQL name
            const name = safeString(r.address, 100) || 'Unknown';

            // Insert with explicit ID
            await db.execute(sql`
                INSERT INTO locations (id, name, state, region, acronym, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${name},
                    ${safeString(r.state, 100)},
                    ${safeString(r.region, 100)},
                    ${safeString(r.acronym, 20)},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;

        } catch (error) {
            console.error(`  ❌ Error migrating location ID ${r.id}:`, error);
            errors++;
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('locations_id_seq', COALESCE((SELECT MAX(id) FROM locations), 1))`);
    console.log('  ✅ Fixed locations_id_seq');

    console.log(`  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateOrganizations(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Organizations ---');

    const rows = await mysqlDb.select().from(mysql_organizations);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    const unmatchedIndustries = new Set<string>();

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM organizations WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // MySQL name → PostgreSQL acronym (e.g., "BSNL")
            // MySQL full_form → PostgreSQL name (e.g., "Bharat Sanchar Nigam Limited")
            const acronym = safeString(r.name, 50);
            const name = safeString(r.full_form, 255) || acronym || 'Unknown';

            // Map industry to industry_id
            const industryId = getIndustryId(r.industry);

            if (r.industry && !industryId) {
                unmatchedIndustries.add(r.industry);
            }

            // Insert with explicit ID
            await db.execute(sql`
                INSERT INTO organizations (id, name, acronym, industry_id, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${name},
                    ${acronym},
                    ${industryId},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;

        } catch (error) {
            console.error(`  ❌ Error migrating organization ID ${r.id}:`, error);
            errors++;
        }
    }

    if (unmatchedIndustries.size > 0) {
        console.log(`\n  ⚠️ Unmatched industries (set to NULL):`);
        [...unmatchedIndustries].slice(0, 20).forEach(i => console.log(`     - "${i}"`));
        if (unmatchedIndustries.size > 20) {
            console.log(`     ... and ${unmatchedIndustries.size - 20} more`);
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('organizations_id_seq', COALESCE((SELECT MAX(id) FROM organizations), 1))`);
    console.log('  ✅ Fixed organizations_id_seq');

    console.log(`  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

// ==================== Verification ====================

async function verifyMigration() {
    console.log('\n========================================');
    console.log('MIGRATION VERIFICATION');
    console.log('========================================\n');

    const tables = ['statuses', 'websites', 'items', 'locations', 'organizations'];

    for (const table of tables) {
        const mysqlCount = await mysqlDb.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
        const pgResult = await db.execute(sql.raw(`SELECT COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM ${table}`));

        const mysqlTotal = (mysqlCount as any)[0]?.count || 0;
        const pgRow = (pgResult as any).rows?.[0] || {};

        console.log(`${table}:`);
        console.log(`  MySQL: ${mysqlTotal} records`);
        console.log(`  PostgreSQL: ${pgRow.count} records (IDs: ${pgRow.min_id} - ${pgRow.max_id})`);
        console.log('');
    }

    console.log('========================================\n');
}

// ==================== Pre-Migration Check ====================

async function preMigrationCheck(): Promise<boolean> {
    console.log('\n--- Pre-Migration Check ---\n');

    const tables = [
        { name: 'statuses', mysql: mysql_statuses },
        { name: 'websites', mysql: mysql_websites },
        { name: 'items', mysql: mysql_items },
        { name: 'locations', mysql: mysql_locations },
        { name: 'organizations', mysql: mysql_organizations },
    ];

    for (const { name } of tables) {
        const result = await mysqlDb.execute(sql.raw(`SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total FROM ${name}`));
        const row = (result as any)[0] || {};
        console.log(`  ${name}: ${row.total} records (IDs: ${row.min_id} - ${row.max_id})`);
    }

    // Check PostgreSQL lookup tables exist
    console.log('\n  Checking PostgreSQL lookup tables...');

    const teamsCheck = await db.execute(sql`SELECT COUNT(*) as count FROM teams`);
    const headingsCheck = await db.execute(sql`SELECT COUNT(*) as count FROM item_headings`);
    const industriesCheck = await db.execute(sql`SELECT COUNT(*) as count FROM industries`);

    console.log(`    teams: ${(teamsCheck as any).rows?.[0]?.count || 0} records`);
    console.log(`    item_headings: ${(headingsCheck as any).rows?.[0]?.count || 0} records`);
    console.log(`    industries: ${(industriesCheck as any).rows?.[0]?.count || 0} records`);

    console.log('\n  ✅ Pre-migration check passed\n');
    return true;
}

// ==================== Main Runner ====================

async function runMigration() {
    const startTime = Date.now();

    console.log('=============================================');
    console.log('LOOKUP TABLES MIGRATION: MySQL → PostgreSQL');
    console.log('Strategy: PRESERVE ORIGINAL IDs');
    console.log('=============================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('\nTables to migrate:');
    console.log('  1. statuses');
    console.log('  2. websites');
    console.log('  3. items (with team_id and heading_id mapping)');
    console.log('  4. locations');
    console.log('  5. organizations (with industry_id mapping)');

    try {
        // Pre-migration check
        await preMigrationCheck();

        // Migrate each table
        const results: Record<string, { migrated: number; skipped: number; errors: number }> = {};

        results.statuses = await migrateStatuses();
        results.websites = await migrateWebsites();
        results.items = await migrateItems();
        results.locations = await migrateLocations();
        results.organizations = await migrateOrganizations();

        // Verification
        await verifyMigration();

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        // Summary
        console.log('=============================================');
        console.log('MIGRATION SUMMARY');
        console.log('=============================================');

        let totalMigrated = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        for (const [table, result] of Object.entries(results)) {
            console.log(`${table}: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors`);
            totalMigrated += result.migrated;
            totalSkipped += result.skipped;
            totalErrors += result.errors;
        }

        console.log('---------------------------------------------');
        console.log(`TOTAL: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalErrors} errors`);
        console.log(`Duration: ${duration} seconds`);
        console.log(`Finished at: ${new Date().toISOString()}`);
        console.log('=============================================\n');

    } catch (error) {
        console.error('\n❌ MIGRATION FAILED:', error);
        throw error;
    } finally {
        await pgClient.end();
        await mysqlPool.end();
    }
}

// Run
runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
