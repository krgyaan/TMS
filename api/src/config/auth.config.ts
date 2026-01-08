import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const authEnvSchema = z.object({
    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('7d'),
    STATE_SECRET: z.string().min(16, 'STATE_SECRET must be at least 16 characters'),
    AUTH_GOOGLE_REDIRECT: z
        .string()
        .url('AUTH_GOOGLE_REDIRECT must be a valid URL'),
});

export type AuthConfig = {
    jwtAccessSecret: string;
    jwtAccessExpiresIn: string;
    stateSecret: string;
    googleRedirect: string;

    // Add cookie configuration
    cookie: {
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
    return {
        jwtAccessSecret: parsed.JWT_ACCESS_SECRET,
        jwtAccessExpiresIn: parsed.JWT_ACCESS_EXPIRES_IN,
        stateSecret: parsed.STATE_SECRET,
        googleRedirect: parsed.AUTH_GOOGLE_REDIRECT,
        cookie: {
            name: 'access_token',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            httpOnly: true, // Cannot be accessed by JavaScript
            secure: isProduction, // HTTPS only in production
            sameSite: 'lax', // CSRF protection
            path: '/',
        },
    } satisfies AuthConfig;
});
