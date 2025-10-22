import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const authEnvSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  AUTH_STATE_SECRET: z.string().min(16, 'AUTH_STATE_SECRET must be at least 16 characters'),
  AUTH_GOOGLE_REDIRECT: z
    .string()
    .url('AUTH_GOOGLE_REDIRECT must be a valid URL')
    .default('http://localhost:5173/login/google'),
});

export type AuthConfig = {
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  stateSecret: string;
  googleRedirect: string;
};

export const validateAuthEnv = (config: Record<string, unknown>) => {
  return authEnvSchema.parse(config);
};

export default registerAs('auth', () => {
  const parsed = authEnvSchema.parse(process.env);
  return {
    jwtAccessSecret: parsed.JWT_ACCESS_SECRET,
    jwtAccessExpiresIn: parsed.JWT_ACCESS_EXPIRES_IN,
    stateSecret: parsed.AUTH_STATE_SECRET,
    googleRedirect: parsed.AUTH_GOOGLE_REDIRECT,
  } satisfies AuthConfig;
});