import 'dotenv/config';
import { createDb, createPool } from '@db';
import { roles } from '@db/schemas/auth/roles.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { designations } from '@db/schemas/master/designations.schema';
import { sql } from 'drizzle-orm';

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');

    const pool = createPool(url);
    const db = createDb(pool);

    await db.execute(sql`TRUNCATE TABLE ${roles} RESTART IDENTITY CASCADE`);
    await db.execute(
        sql`TRUNCATE TABLE ${designations} RESTART IDENTITY CASCADE`,
    );
    await db.execute(sql`TRUNCATE TABLE ${teams} RESTART IDENTITY CASCADE`);

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
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
