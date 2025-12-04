// api/scripts/assign-default-roles.ts
import 'dotenv/config';
import { createDb, createPool } from '../src/db';
import { users } from '../src/db/users.schema';
import { roles } from '../src/db/roles.schema';
import { userRoles } from '../src/db/user-roles.schema';
import { and, eq, isNull, notExists } from 'drizzle-orm';

/**
 * This script assigns default roles to users who don't have one.
 * - Users with 'admin' in their email get 'Super User' role
 * - All other users get 'Executive' role (default)
 */
async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');

    const pool = createPool(url);
    const db = createDb(pool);

    console.log('🚀 Starting role assignment...\n');

    // Get all roles
    const allRoles = await db.select().from(roles);
    const roleMap = new Map(allRoles.map(r => [r.name, r.id]));

    console.log('📋 Available roles:');
    allRoles.forEach(r => console.log(`   - ${r.name} (ID: ${r.id})`));
    console.log('');

    const superUserRoleId = roleMap.get('Super User');
    const executiveRoleId = roleMap.get('Executive');

    if (!superUserRoleId || !executiveRoleId) {
        throw new Error('Required roles not found. Please run seed first.');
    }

    // Find users without roles
    const usersWithoutRoles = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .where(and(isNull(users.deletedAt), isNull(userRoles.id)));

    console.log(`👥 Found ${usersWithoutRoles.length} users without roles\n`);

    if (usersWithoutRoles.length === 0) {
        console.log('✅ All users already have roles assigned.');
        await pool.end();
        return;
    }

    // Assign roles
    const assignments: { userId: number; roleId: number; roleName: string; userName: string }[] = [];

    for (const user of usersWithoutRoles) {
        // Determine role based on email pattern
        // Customize this logic based on your needs
        let roleId = executiveRoleId;
        let roleName = 'Executive';

        if (user.email?.toLowerCase().includes('admin')) {
            roleId = superUserRoleId;
            roleName = 'Super User';
        }

        assignments.push({
            userId: user.id,
            roleId,
            roleName,
            userName: user.name,
        });
    }

    // Preview assignments
    console.log('📝 Planned assignments:');
    assignments.forEach(a => {
        console.log(`   - ${a.userName} (ID: ${a.userId}) → ${a.roleName}`);
    });
    console.log('');

    // Insert role assignments
    const insertData = assignments.map(a => ({
        userId: a.userId,
        roleId: a.roleId,
    }));

    await db.insert(userRoles).values(insertData).onConflictDoNothing();

    console.log(`✅ Successfully assigned roles to ${assignments.length} users`);

    await pool.end();
}

main().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});
