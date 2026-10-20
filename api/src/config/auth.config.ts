import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const authEnvSchema = z.object({
    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
    JWT_REFRESH_EXPIRATION: z.string().default('14d'),
    REFRESH_WINDOW_MS: z.preprocess(
        (v) => (v === undefined ? 86400000 : Number(v)),
        z.number().int().positive()
    ).default(86400000), // 1 day in ms
    STATE_SECRET: z.string().min(16, 'STATE_SECRET must be at least 16 characters'),
    AUTH_GOOGLE_REDIRECT: z
        .string()
        .url('AUTH_GOOGLE_REDIRECT must be a valid URL'),
});

export type AuthConfig = {
    jwtAccessSecret: string;
    jwtAccessExpiresIn: string;
    jwtRefreshSecret: string;
    jwtRefreshExpiration: string;
    refreshWindowMs: number;
    stateSecret: string;
    googleRedirect: string;

    // Cookie configurations
    accessTokenCookie: {
        name: string;
        maxAge: number;
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'strict' | 'lax' | 'none';
        path: string;
    };
    refreshTokenCookie: {
        name: string;
        maxAge: number;
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'strict' | 'lax' | 'none';
        path: string;
    };
};

export const validateAuthEnv = (config: Record<string, unknown>) => {
    return authEnvSchema.parse(config);
};

export default registerAs('auth', () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const parsed = authEnvSchema.parse(process.env);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    return {
        jwtAccessSecret: parsed.JWT_ACCESS_SECRET,
        jwtAccessExpiresIn: parsed.JWT_ACCESS_EXPIRES_IN,
        jwtRefreshSecret: parsed.JWT_REFRESH_SECRET,
        jwtRefreshExpiration: parsed.JWT_REFRESH_EXPIRATION,
        refreshWindowMs: parsed.REFRESH_WINDOW_MS,
        stateSecret: parsed.STATE_SECRET,
        googleRedirect: parsed.AUTH_GOOGLE_REDIRECT,
        accessTokenCookie: {
            name: 'access_token',
            maxAge: sevenDaysMs,
            httpOnly: true, // Cannot be accessed by JavaScript
            secure: isProduction, // HTTPS only in production
            sameSite: 'lax', // CSRF protection
            path: '/',
        },
        refreshTokenCookie: {
            name: 'refresh_token',
            maxAge: fourteenDaysMs,
            httpOnly: true, // Cannot be accessed by JavaScript
            secure: isProduction, // HTTPS only in production
            sameSite: 'lax', // CSRF protection
            path: '/',
        },
    } satisfies AuthConfig;
});
