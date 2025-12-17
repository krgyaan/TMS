import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const googleEnvSchema = z.object({
    GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
    GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
    GOOGLE_REDIRECT_URI: z.string().url('GOOGLE_REDIRECT_URI must be a valid URL'),
    GOOGLE_SCOPES: z.string().min(1, 'GOOGLE_SCOPES is required'),
    GOOGLE_INTEGRATION_REDIRECT_URI: z.string().url().optional(),
    GOOGLE_SUCCESS_REDIRECT: z.string().url().optional(),
});

export type GoogleConfig = {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    integrationRedirectUri: string;
    scopes: string[];
    successRedirect?: string;
};

export const validateGoogleEnv = (config: Record<string, unknown>) => {
    return googleEnvSchema.parse(config);
};

// Drive scopes - ONLY for integration flow, NOT for login
// These are requested separately when users create costing sheets
export const DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
];

export default registerAs('google', () => {
    const parsed = googleEnvSchema.parse(process.env);

    // Login scopes from env (should be: openid email profile)
    // IMPORTANT: Do NOT include Drive scopes here - they are requested separately
    // via createDriveScopeAuthUrl() when users need to create costing sheets
    const loginScopes = parsed.GOOGLE_SCOPES.split(/\s+/).filter(Boolean);

    return {
        clientId: parsed.GOOGLE_CLIENT_ID,
        clientSecret: parsed.GOOGLE_CLIENT_SECRET,
        redirectUri: parsed.GOOGLE_REDIRECT_URI,
        integrationRedirectUri: parsed.GOOGLE_INTEGRATION_REDIRECT_URI ||
            parsed.GOOGLE_REDIRECT_URI.replace('/auth/', '/integrations/'),
        scopes: loginScopes, // Only login scopes here
        successRedirect: parsed.GOOGLE_SUCCESS_REDIRECT,
    } satisfies GoogleConfig;
});
