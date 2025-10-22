import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const googleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url('GOOGLE_REDIRECT_URI must be a valid URL'),
  GOOGLE_SCOPES: z.string().min(1, 'GOOGLE_SCOPES is required'),
  GOOGLE_SUCCESS_REDIRECT: z.string().url().optional(),
});

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  successRedirect?: string;
};

export const validateGoogleEnv = (config: Record<string, unknown>) => {
  return googleEnvSchema.parse(config);
};

export default registerAs('google', () => {
  const parsed = googleEnvSchema.parse(process.env);
  return {
    clientId: parsed.GOOGLE_CLIENT_ID,
    clientSecret: parsed.GOOGLE_CLIENT_SECRET,
    redirectUri: parsed.GOOGLE_REDIRECT_URI,
    scopes: parsed.GOOGLE_SCOPES.split(/\s+/).filter(Boolean),
    successRedirect: parsed.GOOGLE_SUCCESS_REDIRECT,
  } satisfies GoogleConfig;
});
