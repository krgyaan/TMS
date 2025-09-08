import 'dotenv/config';
import { createDb, createPool } from './index';
import { users } from './users.schema';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const pool = createPool(url);
  const db = createDb(pool);

  await db.insert(users).values([
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'bob@example.com', name: 'Bob' },
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

