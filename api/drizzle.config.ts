import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'postgresql',
    out: './drizzle',
    schema: './src/db/schemas/**/*.schema.ts',
    dbCredentials: {
        url: process.env.DATABASE_URL ?? '',
    },
});
