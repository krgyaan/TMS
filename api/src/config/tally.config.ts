import { registerAs } from "@nestjs/config";
import { z } from "zod";

const boolFromEnv = z
    .preprocess(value => {
        if (typeof value === "boolean") return value;
        if (value === undefined || value === null || value === "") return false;
        if (typeof value === "number") return value !== 0;
        if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());

        return false;
    }, z.boolean())
    .default(false);

const intFromEnv = (fallback: number, min = 1) =>
    z.preprocess(value => (value === undefined || value === null || value === "" ? fallback : Number(value)), z.number().int().min(min)).default(fallback);

const rpsFromEnv = z.preprocess(value => (value === undefined || value === null || value === "" ? 2 : Number(value)), z.number().positive()).default(2);

const tallyEnvSchema = z.object({
    TALLY_ENABLED: boolFromEnv,
    TALLY_BASE_URL: z.string().trim().optional(),
    TALLY_AUTH_TOKEN: z.string().optional(),
    TALLY_COMPANY: z.string().trim().optional(),
    TALLY_CONNECT_TIMEOUT_MS: intFromEnv(5000),
    TALLY_HTTP_TIMEOUT_MS: intFromEnv(30000),
    TALLY_RATE_LIMIT_RPS: rpsFromEnv,
    TALLY_MAX_CONCURRENCY: intFromEnv(1),
    TALLY_MAX_RETRIES: intFromEnv(3, 0),
    TALLY_RETRY_BASE_DELAY_MS: intFromEnv(500),
});

export type TallyEnv = z.infer<typeof tallyEnvSchema>;

export interface TallyConfig {
    enabled: boolean;
    baseUrl: string | null;
    authToken: string | null;
    company: string | null;
    connectTimeoutMs: number;
    httpTimeoutMs: number;
    rateLimitRps: number;
    maxConcurrency: number;
    maxRetries: number;
    retryBaseDelayMs: number;
}

const REQUIRED_WHEN_ENABLED = ["TALLY_BASE_URL", "TALLY_AUTH_TOKEN", "TALLY_COMPANY"] as const;

const isPresent = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number" || typeof value === "boolean") return true;

    return false;
};

const formatIssues = (error: z.ZodError): string => error.issues.map(issue => `${issue.path.length ? issue.path.join(".") : "env"}: ${issue.message}`).join("; ");

/**
 * Parses and validates the Tally environment. Values are only required when
 * TALLY_ENABLED=true, so local/CI environments can leave the integration inert.
 * Error messages name the offending variable but never echo its value.
 */
export function parseTallyEnv(env: Record<string, unknown>): TallyConfig {
    const parsed = tallyEnvSchema.safeParse(env);

    if (!parsed.success) {
        throw new Error(`Tally configuration invalid: ${formatIssues(parsed.error)}`);
    }

    const data = parsed.data;

    const base: TallyConfig = {
        enabled: data.TALLY_ENABLED,
        baseUrl: null,
        authToken: null,
        company: null,
        connectTimeoutMs: data.TALLY_CONNECT_TIMEOUT_MS,
        httpTimeoutMs: data.TALLY_HTTP_TIMEOUT_MS,
        rateLimitRps: data.TALLY_RATE_LIMIT_RPS,
        maxConcurrency: data.TALLY_MAX_CONCURRENCY,
        maxRetries: data.TALLY_MAX_RETRIES,
        retryBaseDelayMs: data.TALLY_RETRY_BASE_DELAY_MS,
    };

    if (!data.TALLY_ENABLED) {
        return base;
    }

    const missing = REQUIRED_WHEN_ENABLED.filter(key => !isPresent(env[key]));

    if (missing.length > 0) {
        throw new Error(`Tally is enabled but missing required environment variable(s): ${missing.join(", ")}`);
    }

    const rawUrl = data.TALLY_BASE_URL!.trim();
    let url: URL;

    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error("TALLY_BASE_URL must be a valid absolute URL");
    }

    if (url.protocol !== "https:") {
        throw new Error("TALLY_BASE_URL must use https:// (Tally is reached through the HTTPS reverse proxy)");
    }

    if (url.username || url.password) {
        throw new Error("TALLY_BASE_URL must not contain embedded credentials");
    }

    if (url.search || url.hash) {
        throw new Error("TALLY_BASE_URL must not contain a query string or fragment");
    }

    return {
        ...base,
        baseUrl: rawUrl.replace(/\/+$/, ""),
        authToken: data.TALLY_AUTH_TOKEN!,
        company: data.TALLY_COMPANY!.trim(),
    };
}

export const validateTallyEnv = (env: Record<string, unknown>): Record<string, unknown> => {
    const config = parseTallyEnv(env);

    if (!config.enabled) {
        return {};
    }

    return { ...tallyEnvSchema.parse(env) };
};

export default registerAs("tally", (): TallyConfig => parseTallyEnv(process.env));
