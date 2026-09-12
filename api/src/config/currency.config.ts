import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * USD -> INR conversion for display purposes only.
 *
 * claude_token_usage stores cost in USD (Anthropic bills in USD) -- that
 * column remains the source of truth and is never overwritten. This rate is
 * used purely to compute an INR figure at read time for the System Health
 * dashboard, so it can be corrected/updated at any time without touching
 * historical USD data.
 *
 * DEFAULT_USD_TO_INR_RATE is a manually-set snapshot, NOT a live/fetched
 * rate. Update USD_TO_INR_RATE (and USD_TO_INR_RATE_AS_OF) periodically --
 * both the rate and its "as of" date are surfaced in the telemetry API
 * response and displayed on the dashboard so nobody mistakes a stale
 * snapshot for a live conversion.
 */
const DEFAULT_USD_TO_INR_RATE = 94.83;
const DEFAULT_USD_TO_INR_RATE_AS_OF = '2026-09-08';

const currencyEnvSchema = z.object({
    USD_TO_INR_RATE: z
        .preprocess((v) => (v !== undefined && v !== '' ? Number(v) : DEFAULT_USD_TO_INR_RATE), z.number().positive())
        .default(DEFAULT_USD_TO_INR_RATE),
    USD_TO_INR_RATE_AS_OF: z.string().default(DEFAULT_USD_TO_INR_RATE_AS_OF),
});

export type CurrencyConfig = z.infer<typeof currencyEnvSchema>;

export const validateCurrencyEnv = (config: Record<string, unknown>) => currencyEnvSchema.parse(config);

export default registerAs('currency', () => {
    const env = currencyEnvSchema.parse(process.env);
    return {
        usdToInrRate: env.USD_TO_INR_RATE,
        usdToInrRateAsOf: env.USD_TO_INR_RATE_AS_OF,
    };
});
