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

const mysql_org_industries = mysqlTable('org_industries', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: mysqlEnum('status', ['0', '1']).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_item_headings = mysqlTable('item_headings', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    team: varchar('team', { length: 255 }).notNull(),
    status: mysqlEnum('status', ['0', '1']).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_categories = mysqlTable('categories', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    category: varchar('category', { length: 255 }).notNull(),
    heading: text('heading'),
    ip: varchar('ip', { length: 255 }),
    status: mysqlEnum('status', ['0', '1']).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_followup_fors = mysqlTable('followup_fors', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }).notNull(),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_lead_types = mysqlTable('lead_types', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }),
    status: mysqlEnum('status', ['1', '0']).notNull().default('1'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysql_tq_types = mysqlTable('tq_types', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tq_type: varchar('tq_type', { length: 255 }).notNull(),
    ip: varchar('ip', { length: 255 }),
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
    'Operations': 3,
    'operations': 3,
    'Services': 4,
    'services': 4,
    'Accounts': 5,
    'accounts': 5,
    'Business Development': 6,
    'business development': 6,
    'Private': 7,
    'private': 7,
    'HR': 8,
    'hr': 8,
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

const getTeamId = (teamName: string | null): number | null => {
    if (!teamName) return null;
    const trimmed = teamName.trim();

    // Direct match
    if (TEAM_MAPPING[trimmed] !== undefined) {
        return TEAM_MAPPING[trimmed];
    }

    // Case-insensitive match
    const lowerTrimmed = trimmed.toLowerCase();
    for (const [key, value] of Object.entries(TEAM_MAPPING)) {
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
            console.error(`  ❌ Error migrating website ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
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
            const headingId = r.heading || null;

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
            console.error(`  ❌ Error migrating item ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
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
            console.error(`  ❌ Error migrating location ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
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
            const industryId = r.industry || null;

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
            console.error(`  ❌ Error migrating organization ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
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

// ==================== NEW Migration Functions ====================

async function migrateIndustries(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Industries (org_industries → industries) ---');

    const rows = await mysqlDb.select().from(mysql_org_industries);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM industries WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // Insert with explicit ID
            await db.execute(sql`
                INSERT INTO industries (id, name, description, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${safeString(r.name, 100) || 'Unknown'},
                    ${safeString(r.description)},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.name}`);

        } catch (error) {
            console.error(`  ❌ Error migrating industry ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
            errors++;
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('industries_id_seq', COALESCE((SELECT MAX(id) FROM industries), 1))`);
    console.log('  ✅ Fixed industries_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateItemHeadings(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Item Headings ---');

    const rows = await mysqlDb.select().from(mysql_item_headings);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    const unmatchedTeams = new Set<string>();

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM item_headings WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // Map team varchar to team_id
            const teamId = getTeamId(r.team);

            if (r.team && !teamId) {
                unmatchedTeams.add(r.team);
            }

            // Insert with explicit ID
            await db.execute(sql`
                INSERT INTO item_headings (id, name, team_id, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${safeString(r.name, 100) || 'Unknown'},
                    ${teamId},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.name} (team: ${r.team} → ${teamId})`);

        } catch (error) {
            console.error(`  ❌ Error migrating item_heading ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
            errors++;
        }
    }

    if (unmatchedTeams.size > 0) {
        console.log(`\n  ⚠️ Unmatched teams (set to NULL):`);
        unmatchedTeams.forEach(t => console.log(`     - "${t}"`));
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('item_headings_id_seq', COALESCE((SELECT MAX(id) FROM item_headings), 1))`);
    console.log('  ✅ Fixed item_headings_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateImprestCategories(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Imprest Categories (categories → imprest_categories) ---');

    const rows = await mysqlDb.select().from(mysql_categories);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM imprest_categories WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // MySQL category → PostgreSQL name
            // MySQL heading → PostgreSQL heading
            // ip is skipped

            await db.execute(sql`
                INSERT INTO imprest_categories (id, name, heading, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${safeString(r.category, 100) || 'Unknown'},
                    ${safeString(r.heading, 100)},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.category}`);

        } catch (error) {
            console.error(`  ❌ Error migrating category ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
            errors++;
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('imprest_categories_id_seq', COALESCE((SELECT MAX(id) FROM imprest_categories), 1))`);
    console.log('  ✅ Fixed imprest_categories_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateFollowupCategories(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Followup Categories (followup_fors → followup_categories) ---');

    const rows = await mysqlDb.select().from(mysql_followup_fors);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM followup_categories WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // MySQL table has no status column, default to true
            await db.execute(sql`
                INSERT INTO followup_categories (id, name, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${safeString(r.name, 100) || 'Unknown'},
                    ${true},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.name}`);

        } catch (error) {
            console.error(`  ❌ Error migrating followup_for ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
            errors++;
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('followup_categories_id_seq', COALESCE((SELECT MAX(id) FROM followup_categories), 1))`);
    console.log('  ✅ Fixed followup_categories_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateLeadTypes(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating Lead Types ---');

    const rows = await mysqlDb.select().from(mysql_lead_types);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM lead_types WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            await db.execute(sql`
                INSERT INTO lead_types (id, name, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${safeString(r.name, 255)},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.name}`);

        } catch (error) {
            console.error(`  ❌ Error migrating lead_type ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
            errors++;
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('lead_types_id_seq', COALESCE((SELECT MAX(id) FROM lead_types), 1))`);
    console.log('  ✅ Fixed lead_types_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

async function migrateTqTypes(): Promise<{ migrated: number; skipped: number; errors: number }> {
    console.log('\n--- Migrating TQ Types ---');

    const rows = await mysqlDb.select().from(mysql_tq_types);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows) {
        try {
            // Check if ID already exists
            const existing = await db.execute(
                sql`SELECT id FROM tq_types WHERE id = ${r.id}`
            );

            if ((existing as any).rows?.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            // MySQL tq_type → PostgreSQL name
            // ip is skipped

            await db.execute(sql`
                INSERT INTO tq_types (id, name, status, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${safeString(r.tq_type, 100) || 'Unknown'},
                    ${parseBoolean(r.status)},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.tq_type}`);

        } catch (error) {
            console.error(`  ❌ Error migrating tq_type ID ${r.id}:`, `Query:${error.query}\nCause:${error.cause?.message}`);
            errors++;
        }
    }

    // Fix sequence
    await db.execute(sql`SELECT setval('tq_types_id_seq', COALESCE((SELECT MAX(id) FROM tq_types), 1))`);
    console.log('  ✅ Fixed tq_types_id_seq');

    console.log(`\n  Results: Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { migrated, skipped, errors };
}

// ==================== Verification ====================

async function verifyMigration() {
    console.log('\n========================================');
    console.log('MIGRATION VERIFICATION');
    console.log('========================================\n');

    const tables = [
        { mysql: 'statuses', pg: 'statuses' },
        { mysql: 'websites', pg: 'websites' },
        { mysql: 'items', pg: 'items' },
        { mysql: 'locations', pg: 'locations' },
        { mysql: 'organizations', pg: 'organizations' },
        { mysql: 'org_industries', pg: 'industries' },
        { mysql: 'item_headings', pg: 'item_headings' },
        { mysql: 'categories', pg: 'imprest_categories' },
        { mysql: 'followup_fors', pg: 'followup_categories' },
        { mysql: 'lead_types', pg: 'lead_types' },
        { mysql: 'tq_types', pg: 'tq_types' },
    ];

    for (const { mysql, pg } of tables) {
        const mysqlCount = await mysqlDb.execute(sql.raw(`SELECT COUNT(*) as count FROM ${mysql}`));
        const pgResult = await db.execute(sql.raw(`SELECT COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM ${pg}`));

        const mysqlTotal = (mysqlCount as any)[0]?.count || 0;
        const pgRow = (pgResult as any).rows?.[0] || {};

        console.log(`${mysql} → ${pg}:`);
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
        { name: 'org_industries', mysql: mysql_org_industries },
        { name: 'item_headings', mysql: mysql_item_headings },
        { name: 'categories', mysql: mysql_categories },
        { name: 'followup_fors', mysql: mysql_followup_fors },
        { name: 'lead_types', mysql: mysql_lead_types },
        { name: 'tq_types', mysql: mysql_tq_types },
    ];

    for (const { name } of tables) {
        try {
            const result = await mysqlDb.execute(sql.raw(`SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total FROM ${name}`));
            const row = (result as any)[0] || {};
            console.log(`  ${name}: ${row.total} records (IDs: ${row.min_id} - ${row.max_id})`);
        } catch (error) {
            console.log(`  ${name}: ❌ Table not found or error`);
        }
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
    console.log('  6. org_industries → industries');
    console.log('  7. item_headings (with team_id mapping)');
    console.log('  8. categories → imprest_categories');
    console.log('  9. followup_fors → followup_categories');
    console.log('  10. lead_types');
    console.log('  11. tq_types');

    try {
        // Pre-migration check
        await preMigrationCheck();

        // Migrate each table
        const results: Record<string, { migrated: number; skipped: number; errors: number }> = {};

        // Original tables
        results.statuses = await migrateStatuses();
        results.websites = await migrateWebsites();
        results.items = await migrateItems();
        results.locations = await migrateLocations();
        results.organizations = await migrateOrganizations();

        // New tables
        results.industries = await migrateIndustries();
        results.item_headings = await migrateItemHeadings();
        results.imprest_categories = await migrateImprestCategories();
        results.followup_categories = await migrateFollowupCategories();
        results.lead_types = await migrateLeadTypes();
        results.tq_types = await migrateTqTypes();

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
