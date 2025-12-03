import 'dotenv/config';
import { createDb, createPool } from './index';
import { roles } from './roles.schema';
import { teams } from './teams.schema';
import { designations } from './designations.schema';
import { users } from './users.schema';
import { sql } from 'drizzle-orm';
import { hash } from 'argon2';

const defaultAdminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');

    const pool = createPool(url);
    const db = createDb(pool);

    await db.execute(sql`TRUNCATE TABLE ${users} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${roles} RESTART IDENTITY CASCADE`);
    await db.execute(
        sql`TRUNCATE TABLE ${designations} RESTART IDENTITY CASCADE`,
    );
    await db.execute(sql`TRUNCATE TABLE ${teams} RESTART IDENTITY CASCADE`);

    const adminPassword = await hash(defaultAdminPassword);

    await db
        .insert(users)
        .values({
            name: 'System Admin',
            email: defaultAdminEmail,
            password: adminPassword,
            isActive: true,
        })
        .onConflictDoNothing({ target: users.email });

    await db
        .insert(roles)
        .values([
            { name: 'Super User' },
            { name: 'Admin' },
            { name: 'Team Leader' },
            { name: 'Coordinator' },
            { name: 'Executive' },
            { name: 'Engineer' },
            { name: 'Field' },
        ])
        .onConflictDoNothing({ target: [roles.name, roles.guardName] });

    const designationNames = [
        'CEO',
        'COO',
        'Coordinator',
        'Team Leader',
        'Executive',
        'Engineer',
        'Intern',
    ];
    await db
        .insert(designations)
        .values(designationNames.map((name) => ({ name })))
        .onConflictDoNothing({ target: [designations.name] });

    const teamNames = [
        'AC',
        'DC',
        'Operations',
        'Services',
        'Accounts',
        'Business Development',
        'Private',
        'HR',
    ];
    const existingTeams = await db.select({ name: teams.name }).from(teams);
    const existingTeamNames = new Set(existingTeams.map((t) => t.name));
    const newTeams = teamNames
        .filter((name) => !existingTeamNames.has(name))
        .map((name) => ({ name }));
    if (newTeams.length > 0) {
        await db.insert(teams).values(newTeams);
    }

    await pool.end();

    console.log('Seed completed');
    console.log(`Admin user: ${defaultAdminEmail} / ${defaultAdminPassword}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
