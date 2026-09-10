import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const volksAiEnvSchema = z.object({
    VOLKS_AI_SERVICE_URL: z.string().url().default('http://localhost:8001'),
    VOLKS_AI_TIMEOUT_MS: z
        .preprocess((v) => (v !== undefined && v !== '' ? Number(v) : 120000), z.number().int().positive())
        .default(120000),
});

export type VolksAiConfig = z.infer<typeof volksAiEnvSchema>;

export const validateVolksAiEnv = (config: Record<string, unknown>) => volksAiEnvSchema.parse(config);

export default registerAs('volksAi', () => {
    const env = volksAiEnvSchema.parse(process.env);
    return {
        serviceUrl: env.VOLKS_AI_SERVICE_URL,
        timeoutMs: env.VOLKS_AI_TIMEOUT_MS,
        VOLKS_AI_SERVICE_URL: env.VOLKS_AI_SERVICE_URL,
        VOLKS_AI_TIMEOUT_MS: env.VOLKS_AI_TIMEOUT_MS,
    };
});
