import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const redisEnvSchema = z.object({
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.preprocess(v => Number(v) || 6379, z.number().int().positive()).default(6379),
});

export const validateRedisEnv = (config: Record<string, unknown>) => redisEnvSchema.parse(config);

export default registerAs('redis', () => {
    const env = redisEnvSchema.parse(process.env);
    return {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
    };
});
