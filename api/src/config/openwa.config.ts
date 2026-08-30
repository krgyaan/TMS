// Env validation + typed config
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  OPENWA_BASE_URL: z.string().url().default('http://localhost:2785'),
  OPENWA_API_KEY: z.string().min(1, 'OPENWA_API_KEY is required'),
  OPENWA_SESSION_ID: z.string().uuid('OPENWA_SESSION_ID must be a valid UUID'),
  OPENWA_WEBHOOK_SECRET: z.string().min(1, 'OPENWA_WEBHOOK_SECRET is required'),
});

export type OpenwaConfig = z.infer<typeof schema>;

export const openwaConfig = registerAs('openwa', (): OpenwaConfig => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`OpenWA config validation failed: ${parsed.error.message}`);
  }
  return parsed.data;
});

export default openwaConfig;

export const validateOpenwaEnv = (env: Record<string, unknown>) => {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`OpenWA config validation failed: ${parsed.error.message}`);
  }
  return parsed.data;
};