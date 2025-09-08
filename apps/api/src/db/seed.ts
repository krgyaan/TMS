import 'dotenv/config';
import { createDb, createPool } from './index';
import { roles } from './roles.schema';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const pool = createPool(url);
  const db = createDb(pool);

  await db.insert(roles).values([
    { name: 'Super User' },
    { name: 'Admin (CEO/COO)' },
    { name: 'Team Leader' },
    { name: 'Coordinator' },
    { name: 'Executive' },
    { name: 'Engineer' },
    { name: 'Field' },
  ]);

  await pool.end();
  // eslint-disable-next-line no-console
  console.log('Seed completed');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
