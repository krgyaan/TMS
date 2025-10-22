import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const appEnvSchema = z.object({
  PORT: z
    .preprocess(
      (v) => (v === undefined ? 3000 : Number(v)),
      z.number().int().positive(),
    )
    .default(3000),
  API_PREFIX: z.string().optional().default('api/v1'),
});

export type AppConfig = z.infer<typeof appEnvSchema>;

export const validateAppEnv = (config: Record<string, unknown>) => {
  // zod defaults apply during parse
  return appEnvSchema.parse(config);
};

export default registerAs('app', () => {
  const parsed = appEnvSchema.parse(process.env);
  return {
    port: parsed.PORT,
    apiPrefix: parsed.API_PREFIX,
  } as { port: number; apiPrefix: string };
});
