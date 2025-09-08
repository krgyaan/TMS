import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const dbEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  PGSSL: z
    .preprocess((v) => (v === undefined ? false : v === 'true' || v === true), z.boolean())
    .optional()
    .default(false),
  PG_MAX_POOL: z
    .preprocess((v) => (v === undefined ? 10 : Number(v)), z.number().int().positive())
    .optional()
    .default(10),
});

export type DbConfigEnv = z.infer<typeof dbEnvSchema>;

export const validateDbEnv = (config: Record<string, unknown>) => dbEnvSchema.parse(config);

export default registerAs('db', () => {
  const env = dbEnvSchema.parse(process.env);
  return {
    url: env.DATABASE_URL,
    ssl: env.PGSSL,
    maxPool: env.PG_MAX_POOL as number,
  } as { url: string; ssl: boolean; maxPool: number };
});

