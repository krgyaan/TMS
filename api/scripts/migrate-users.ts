// migrate-users.ts
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import {
    mysqlTable,
    varchar,
    int,
    text,
    timestamp,
    mysqlEnum,
} from 'drizzle-orm/mysql-core';
import { eq, sql } from 'drizzle-orm';
import { Client } from 'pg';

// Import PostgreSQL schemas
import { users } from '../src/db/users.schema';
import { userProfiles } from '../src/db/user-profiles.schema';
import { userRoles } from '../src/db/user-roles.schema';
import { userPermissions } from '../src/db/user-permissions.schema';
import { permissions } from '../src/db/permissions.schema';

// ==================== Configuration ====================

const PG_URL = 'postgresql://postgres:gyan@localhost:5432/new_tms';
const MYSQL_URL = 'mysql://root:gyan@localhost:3306/mydb';

const pgClient = new Client({ connectionString: PG_URL });
pgClient.connect();
const db = pgDrizzle(pgClient);

const mysqlPool = mysql2.createPool(MYSQL_URL);
const mysqlDb = mysqlDrizzle(mysqlPool);

// ==================== MySQL Table Definition ====================

const mysqlUsers = mysqlTable('users', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    app_password: varchar('app_password', { length: 20 }),
    role: varchar('role', { length: 255 }).notNull(),
    mobile: varchar('mobile', { length: 20 }),
    address: text('address'),
    id_proof: varchar('id_proof', { length: 255 }),
    designation: varchar('designation', { length: 50 }),
    team: varchar('team', { length: 10 }),
    image: varchar('image', { length: 255 }),
    permissions: text('permissions'),
    status: mysqlEnum('status', ['1', '0']).notNull().default('1'),
    sign: varchar('sign', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ==================== EXACT MAPPINGS ====================

/**
 * MySQL role → PostgreSQL roles.id
 *
 * PostgreSQL Roles:
 * 1 = Super User, 2 = Admin, 3 = Team Leader, 4 = Coordinator,
 * 5 = Executive, 6 = Engineer, 7 = Field, 8 = tender-executive, 9 = operation-engineer
 */
const ROLE_MAPPING: Record<string, number> = {
    // Admin roles
    'admin': 2,
    'super-admin': 1,
    'super_admin': 1,
    'superadmin': 1,

    // Coordinator roles
    'coordinator': 4,

    // Team Leader roles
    'team-leader': 3,
    'team_leader': 3,
    'teamleader': 3,

    // Executive/Employee roles
    'employee': 5,
    'tender-executive': 8,
    'tender_executive': 8,
    'executive': 5,

    // Engineer roles
    'engineer': 6,
    'operation-engineer': 9,
    'operation_engineer': 9,

    // Field roles
    'field': 7,
};

/**
 * MySQL designation → PostgreSQL designations.id
 *
 * PostgreSQL Designations:
 * 1 = CEO, 2 = COO, 3 = Coordinator, 4 = Team Leader,
 * 5 = Executive, 6 = Engineer, 7 = Field
 */
const DESIGNATION_MAPPING: Record<string, number> = {
    // CEO
    'CEO': 1,
    'ceo': 1,

    // COO
    'COO': 2,
    'coo': 2,

    // Coordinator variants
    'Coordinator': 3,
    'coordinator': 3,
    'dc-coordinator': 3,
    'ac-coordinator': 3,

    // Team Leader variants
    'Team Leader': 4,
    'team-leader': 4,
    'team_leader': 4,
    'dc-team-leader': 4,
    'ac-team-leader': 4,
    'dc-operation-leader': 4,
    'ac-operation-leader': 4,

    // Executive variants
    'Executive': 5,
    'executive': 5,
    'tender-executive': 5,
    'dc-tender-executive': 5,
    'ac-tender-executive': 5,

    // Engineer variants
    'Engineer': 6,
    'engineer': 6,
    'operation-engineer': 6,
    'dc-engineer': 6,
    'ac-engineer': 6,

    // Field variants
    'Field': 7,
    'field': 7,
};

/**
 * MySQL team → PostgreSQL teams.id
 *
 * PostgreSQL Teams:
 * 1 = DC, 2 = AC, 3 = Operations, 4 = Services,
 * 5 = Accounts, 6 = Business Development, 7 = Private, 8 = HR
 */
const TEAM_MAPPING: Record<string, number> = {
    // DC team
    'DC': 1,
    'dc': 1,
    'Dc': 1,

    // AC team
    'AC': 2,
    'ac': 2,
    'Ac': 2,

    // Operations team
    'Operations': 3,
    'operations': 3,
    'ops': 3,

    // Services team
    'Services': 4,
    'services': 4,
    'service': 4,
    'Service': 4,

    // Accounts team
    'Accounts': 5,
    'accounts': 5,
    'account': 5,
    'Account': 5,

    // Business Development team
    'Business Development': 6,
    'business development': 6,
    'BD': 6,
    'bd': 6,

    // Private team
    'Private': 7,
    'private': 7,

    // HR team
    'HR': 8,
    'hr': 8,
};

// ==================== Types ====================

interface MigrationResult {
    migrated: number;
    skipped: number;
    errors: number;
    total: number;
}

// ==================== Helper Functions ====================

const parseDate = (val: string | Date | null | undefined): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const parseDateForSQL = (val: string | Date | null | undefined): string => {
    if (!val) return 'NOW()';
    const d = new Date(val);
    if (isNaN(d.getTime())) return 'NOW()';
    return `'${d.toISOString()}'`;
};

const parseName = (name: string | null): { firstName: string | null; lastName: string | null } => {
    if (!name) return { firstName: null, lastName: null };
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: null };
    }
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
};

const getRoleId = (mysqlRole: string | null): number | null => {
    if (!mysqlRole) return null;
    const normalized = mysqlRole.trim().toLowerCase();
    return ROLE_MAPPING[normalized] || ROLE_MAPPING[mysqlRole.trim()] || null;
};

const getDesignationId = (mysqlDesignation: string | null): number | null => {
    if (!mysqlDesignation) return null;
    const trimmed = mysqlDesignation.trim();
    return DESIGNATION_MAPPING[trimmed] || DESIGNATION_MAPPING[trimmed.toLowerCase()] || null;
};

const getTeamId = (mysqlTeam: string | null): number | null => {
    if (!mysqlTeam) return null;
    const trimmed = mysqlTeam.trim();
    return TEAM_MAPPING[trimmed] || TEAM_MAPPING[trimmed.toLowerCase()] || null;
};

const parsePermissions = async (permissionsStr: string | null): Promise<number[]> => {
    if (!permissionsStr) return [];

    const permissionIds: number[] = [];
    const permList = permissionsStr.split(',').map(p => p.trim()).filter(p => p && p !== 'all');

    for (const permName of permList) {
        const result = await db
            .select({ id: permissions.id })
            .from(permissions)
            .where(eq(permissions.action, permName))
            .limit(1);

        if (result.length > 0) {
            permissionIds.push(result[0].id);
        }
    }

    return permissionIds;
};

// ==================== Main Migration Function ====================

async function migrateUsers(): Promise<MigrationResult> {
    console.log('\nMigrating Users (Preserving Original IDs)...');

    const rows = await mysqlDb.select().from(mysqlUsers);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    const unmatchedRoles = new Map<string, number>();
    const unmatchedDesignations = new Map<string, number>();
    const unmatchedTeams = new Map<string, number>();

    for (const r of rows) {
        try {
            // Check if user already exists by ID or email
            const existingById = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.id, r.id))
                .limit(1);

            if (existingById.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Already exists`);
                skipped++;
                continue;
            }

            const existingByEmail = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, r.email))
                .limit(1);

            if (existingByEmail.length > 0) {
                console.log(`  ⚠️ Skipped ID ${r.id}: Email ${r.email} already exists`);
                skipped++;
                continue;
            }

            // Parse name
            const { firstName, lastName } = parseName(r.name);

            // Get mapped IDs
            const roleId = getRoleId(r.role);
            const designationId = getDesignationId(r.designation);
            const teamId = getTeamId(r.team);

            // Track unmatched for reporting
            if (r.role && !roleId) {
                unmatchedRoles.set(r.role, (unmatchedRoles.get(r.role) || 0) + 1);
            }
            if (r.designation && !designationId) {
                unmatchedDesignations.set(r.designation, (unmatchedDesignations.get(r.designation) || 0) + 1);
            }
            if (r.team && !teamId) {
                unmatchedTeams.set(r.team, (unmatchedTeams.get(r.team) || 0) + 1);
            }

            // Step 1: Insert into users table WITH EXPLICIT ID
            await db.execute(sql`
                INSERT INTO users (id, name, email, mobile, password, email_verified_at, last_login_at, is_active, remember_token, created_at, updated_at, deleted_at)
                VALUES (
                    ${r.id},
                    ${r.name?.trim() || r.email.split('@')[0]},
                    ${r.email},
                    ${r.mobile || null},
                    ${r.password},
                    ${null},
                    ${null},
                    ${r.status === '1'},
                    ${null},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()},
                    ${null}
                )
            `);

            // Step 2: Insert into user_profiles WITH EXPLICIT user_id
            await db.execute(sql`
                INSERT INTO user_profiles (user_id, first_name, last_name, date_of_birth, gender, employee_code, designation_id, primary_team_id, alt_email, emergency_contact_name, emergency_contact_phone, image, signature, date_of_joining, date_of_exit, timezone, locale, created_at, updated_at)
                VALUES (
                    ${r.id},
                    ${firstName},
                    ${lastName},
                    ${null},
                    ${null},
                    ${null},
                    ${designationId},
                    ${teamId},
                    ${null},
                    ${null},
                    ${null},
                    ${r.image || null},
                    ${r.sign || null},
                    ${null},
                    ${null},
                    ${'Asia/Kolkata'},
                    ${'en'},
                    ${parseDate(r.created_at) || new Date()},
                    ${parseDate(r.updated_at) || new Date()}
                )
            `);

            // Step 3: Insert into user_roles (if role matched)
            if (roleId) {
                await db.execute(sql`
                    INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
                    VALUES (
                        ${r.id},
                        ${roleId},
                        ${parseDate(r.created_at) || new Date()},
                        ${parseDate(r.updated_at) || new Date()}
                    )
                `);
            }

            // Step 4: Parse and assign permissions
            const permissionIds = await parsePermissions(r.permissions);
            for (const permId of permissionIds) {
                await db.execute(sql`
                    INSERT INTO user_permissions (user_id, permission_id, granted, created_at, updated_at)
                    VALUES (
                        ${r.id},
                        ${permId},
                        ${true},
                        ${parseDate(r.created_at) || new Date()},
                        ${parseDate(r.updated_at) || new Date()}
                    )
                `);
            }

            migrated++;
            console.log(`  ✓ Migrated: ID ${r.id} - ${r.email}`);

        } catch (error) {
            console.error(`  ❌ Error migrating user ID ${r.id} (${r.email}):`, error);
            errors++;
        }
    }

    // Report unmatched values
    if (unmatchedRoles.size > 0) {
        console.log(`\n  ⚠️ Unmatched ROLES:`);
        unmatchedRoles.forEach((count, role) => {
            console.log(`     - "${role}": ${count} user(s)`);
        });
    }

    if (unmatchedDesignations.size > 0) {
        console.log(`\n  ⚠️ Unmatched DESIGNATIONS:`);
        unmatchedDesignations.forEach((count, designation) => {
            console.log(`     - "${designation}": ${count} user(s)`);
        });
    }

    if (unmatchedTeams.size > 0) {
        console.log(`\n  ⚠️ Unmatched TEAMS:`);
        unmatchedTeams.forEach((count, team) => {
            console.log(`     - "${team}": ${count} user(s)`);
        });
    }

    console.log(`\n  ✅ Migrated: ${migrated}, ⚠️ Skipped: ${skipped}, ❌ Errors: ${errors}`);

    return { migrated, skipped, errors, total: rows.length };
}

// ==================== Fix Sequences ====================

async function fixSequences() {
    console.log('\nFixing PostgreSQL sequences...');

    // Fix users sequence
    await db.execute(sql`
        SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))
    `);
    console.log('  ✅ Fixed users_id_seq');

    // Fix user_profiles sequence
    await db.execute(sql`
        SELECT setval('user_profiles_id_seq', COALESCE((SELECT MAX(id) FROM user_profiles), 1))
    `);
    console.log('  ✅ Fixed user_profiles_id_seq');

    // Fix user_roles sequence
    await db.execute(sql`
        SELECT setval('user_roles_id_seq', COALESCE((SELECT MAX(id) FROM user_roles), 1))
    `);
    console.log('  ✅ Fixed user_roles_id_seq');

    // Fix user_permissions sequence
    await db.execute(sql`
        SELECT setval('user_permissions_id_seq', COALESCE((SELECT MAX(id) FROM user_permissions), 1))
    `);
    console.log('  ✅ Fixed user_permissions_id_seq');
}

// ==================== Verification ====================

async function verifyMigration() {
    console.log('\n========================================');
    console.log('USER MIGRATION VERIFICATION');
    console.log('========================================\n');

    // Source counts
    const mysqlCount = (await mysqlDb.select().from(mysqlUsers)).length;

    // Target counts
    const pgUserCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const pgProfileCount = await db.select({ count: sql<number>`count(*)` }).from(userProfiles);
    const pgUserRoleCount = await db.select({ count: sql<number>`count(*)` }).from(userRoles);
    const pgUserPermCount = await db.select({ count: sql<number>`count(*)` }).from(userPermissions);

    // Check ID preservation
    const mysqlIds = (await mysqlDb.select({ id: mysqlUsers.id }).from(mysqlUsers)).map(r => r.id);
    const pgIds = (await db.select({ id: users.id }).from(users)).map(r => r.id);

    const missingIds = mysqlIds.filter(id => !pgIds.includes(id));
    const extraIds = pgIds.filter(id => !mysqlIds.includes(id));

    console.log('Record Counts:');
    console.log('--------------');
    console.log(`  MySQL users:          ${mysqlCount}`);
    console.log(`  PostgreSQL users:     ${pgUserCount[0].count}`);
    console.log(`  PostgreSQL profiles:  ${pgProfileCount[0].count}`);
    console.log(`  PostgreSQL user_roles: ${pgUserRoleCount[0].count}`);
    console.log(`  PostgreSQL user_perms: ${pgUserPermCount[0].count}`);

    console.log('\nID Preservation Check:');
    console.log('----------------------');
    console.log(`  MySQL IDs:     ${mysqlIds.length}`);
    console.log(`  PostgreSQL IDs: ${pgIds.length}`);

    if (missingIds.length > 0) {
        console.log(`  ❌ Missing IDs: ${missingIds.join(', ')}`);
    } else {
        console.log('  ✅ All IDs preserved');
    }

    if (extraIds.length > 0) {
        console.log(`  ⚠️ Extra IDs in PostgreSQL: ${extraIds.join(', ')}`);
    }

    // Verify ID gaps are preserved
    const expectedGaps = [1, 2, 3, 4, 5, 6, 54, 55, 56];
    const actualGaps = expectedGaps.filter(id => !pgIds.includes(id));

    console.log('\nGap Preservation:');
    console.log('-----------------');
    console.log(`  Expected gaps: ${expectedGaps.join(', ')}`);
    console.log(`  Actual gaps:   ${actualGaps.join(', ')}`);
    console.log(`  ${actualGaps.length === expectedGaps.length ? '✅ All gaps preserved' : '⚠️ Gap mismatch'}`);

    // Check max ID and sequence
    const maxId = await db.select({ max: sql<number>`MAX(id)` }).from(users);
    console.log(`\nSequence Info:`);
    console.log(`--------------`);
    console.log(`  Max user ID: ${maxId[0].max}`);
    console.log(`  Next insert will get ID: ${Number(maxId[0].max) + 1}`);

    console.log('\n========================================');
    console.log('✅ VERIFICATION COMPLETE');
    console.log('========================================\n');
}

// ==================== Pre-Migration Check ====================

async function preMigrationCheck(): Promise<boolean> {
    console.log('\n--- Pre-Migration Check ---\n');

    const mysqlCount = (await mysqlDb.select().from(mysqlUsers)).length;
    const mysqlIds = (await mysqlDb.select({ id: mysqlUsers.id }).from(mysqlUsers)).map(r => r.id);

    console.log(`  MySQL users: ${mysqlCount} records`);
    console.log(`  ID range: ${Math.min(...mysqlIds)} to ${Math.max(...mysqlIds)}`);

    // Find gaps
    const allPossibleIds = Array.from({ length: Math.max(...mysqlIds) }, (_, i) => i + 1);
    const gaps = allPossibleIds.filter(id => !mysqlIds.includes(id));
    console.log(`  Missing IDs (gaps): ${gaps.join(', ')}`);

    // Check PostgreSQL
    const pgUserCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    console.log(`\n  PostgreSQL existing users: ${pgUserCount[0].count}`);

    if (Number(pgUserCount[0].count) > 0) {
        console.log('  ⚠️ WARNING: PostgreSQL users table is not empty!');
        console.log('     Existing users will be skipped.');
    }

    console.log('\n  ✅ Pre-migration check passed\n');
    return true;
}

// ==================== Main Runner ====================

async function runUserMigration() {
    const startTime = Date.now();

    console.log('=============================================');
    console.log('USER MIGRATION: MySQL → PostgreSQL');
    console.log('Strategy: PRESERVE ORIGINAL IDs');
    console.log('=============================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('\nThis migration will:');
    console.log('  1. Insert users with their ORIGINAL MySQL IDs');
    console.log('  2. Preserve ID gaps (1-6, 54-56 will remain empty)');
    console.log('  3. Fix sequences after migration');
    console.log('  4. Map roles, designations, teams to PostgreSQL IDs');

    try {
        const checkPassed = await preMigrationCheck();
        if (!checkPassed) {
            throw new Error('Pre-migration check failed');
        }

        console.log('\n--- Step 1/3: Migrating Users ---');
        const result = await migrateUsers();

        console.log('\n--- Step 2/3: Fixing Sequences ---');
        await fixSequences();

        console.log('\n--- Step 3/3: Verification ---');
        await verifyMigration();

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('=============================================');
        console.log('MIGRATION SUMMARY');
        console.log('=============================================');
        console.log(`Total in MySQL:  ${result.total}`);
        console.log(`Migrated:        ${result.migrated}`);
        console.log(`Skipped:         ${result.skipped}`);
        console.log(`Errors:          ${result.errors}`);
        console.log(`Duration:        ${duration} seconds`);
        console.log(`\nID Preservation: ✅ Original IDs maintained`);
        console.log(`Gaps Preserved:  ✅ IDs 1-6, 54-56 kept empty`);
        console.log(`\nFinished at:     ${new Date().toISOString()}`);
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
runUserMigration()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
