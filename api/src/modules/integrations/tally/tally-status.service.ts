import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { TallyClient, type TallyLogger } from "./client/tally.client";
import {
    isTallyError,
    TallyAuthError,
    TallyCompanyMismatch,
    TallyCompanyNotOpen,
    TallyProtocolError,
    TallyRateLimited,
    TallyTimeout,
    TallyUnreachable,
} from "./errors/tally.errors";
import { namesEqual } from "./masters/name.util";
import { TALLY_CONFIG } from "./tally.constants";
import type { TallyConfig } from "@/config/tally.config";

export const TALLY_STATUS_CACHE_TTL_MS = 60_000;
export const TALLY_STATUS_CHECK_TIMEOUT_MS = 8_000;

export type TallyStatusState = "disabled" | "ok" | "degraded" | "down";

export interface TallyStatusConnection {
    enabled: boolean;
    reachable: boolean;
    authOk: boolean;
    latencyMs: number | null;
    host: string | null;
}

export interface TallyStatusCompany {
    configured: string | null;
    open: boolean;
    loaded: boolean;
    loadedCompanies: string[];
}

export interface TallyStatusLimits {
    rateLimitRps: number;
    maxConcurrency: number;
    connectTimeoutMs: number;
    httpTimeoutMs: number;
}

export interface TallyStatusFailure {
    code: string;
    message: string;
    at: string;
}

export interface TallyStatusSnapshot {
    status: TallyStatusState;
    message: string;
    checkedAt: string;
    stale: boolean;
    cache: { ttlSeconds: number; ageSeconds: number };
    connection: TallyStatusConnection;
    company: TallyStatusCompany;
    limits: TallyStatusLimits;
    lastSuccessAt: string | null;
    lastFailure: TallyStatusFailure | null;
}

interface CachedStatus {
    snapshot: TallyStatusSnapshot;
    cachedAt: number;
    expiresAt: number;
}

interface MappedFailure {
    status: "down" | "degraded";
    code: string;
    message: string;
    reachable: boolean;
    authOk: boolean;
}

const mapError = (error: unknown): MappedFailure => {
    if (error instanceof TallyAuthError) {
        return {
            status: "down",
            code: "AUTH",
            message: "Authentication failed. Check the Tally reverse-proxy token.",
            reachable: true,
            authOk: false,
        };
    }

    if (error instanceof TallyTimeout) {
        return {
            status: "down",
            code: "TIMEOUT",
            message: "TallyPrime did not respond in time.",
            reachable: false,
            authOk: false,
        };
    }

    if (error instanceof TallyUnreachable) {
        return {
            status: "down",
            code: "UNREACHABLE",
            message: "TallyPrime is unreachable.",
            reachable: false,
            authOk: false,
        };
    }

    if (error instanceof TallyCompanyNotOpen) {
        return {
            status: "degraded",
            code: "COMPANY_NOT_OPEN",
            message: "No company is open in TallyPrime.",
            reachable: true,
            authOk: true,
        };
    }

    if (error instanceof TallyCompanyMismatch) {
        return {
            status: "degraded",
            code: "COMPANY_MISMATCH",
            message: "The configured company is not loaded in TallyPrime.",
            reachable: true,
            authOk: true,
        };
    }

    if (error instanceof TallyRateLimited) {
        return {
            status: "degraded",
            code: "RATE_LIMITED",
            message: "TallyPrime is rate-limiting requests.",
            reachable: true,
            authOk: true,
        };
    }

    if (error instanceof TallyProtocolError || isTallyError(error)) {
        return {
            status: "degraded",
            code: "PROTOCOL",
            message: "TallyPrime returned an unexpected response.",
            reachable: true,
            authOk: true,
        };
    }

    return {
        status: "down",
        code: "UNKNOWN",
        message: "Tally health check failed.",
        reachable: true,
        authOk: false,
    };
};

/**
 * Cached, sanitised Tally status for dashboards.
 *
 * One shared check serves every viewer for TALLY_STATUS_CACHE_TTL_MS, and
 * concurrent callers share a single in-flight check. Responses contain mapped
 * messages only: never the token, raw Tally text, or the endpoint path.
 */
@Injectable()
export class TallyStatusService {
    private cache: CachedStatus | null = null;
    private inFlight: Promise<void> | null = null;
    private lastSuccessAt: string | null = null;
    private lastFailure: TallyStatusFailure | null = null;
    private lastCompany: TallyStatusCompany | null = null;

    constructor(
        @Inject(TALLY_CONFIG) private readonly config: TallyConfig,
        private readonly client: TallyClient,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: TallyLogger
    ) {}

    async getStatus(): Promise<TallyStatusSnapshot> {
        if (!this.config.enabled) {
            return this.disabledSnapshot();
        }

        const now = Date.now();

        if (this.cache && this.cache.expiresAt > now) {
            return this.withAge(this.cache, now);
        }

        if (!this.inFlight) {
            this.inFlight = this.runCheck().finally(() => {
                this.inFlight = null;
            });
        }

        await this.inFlight;

        return this.cache ? this.withAge(this.cache, Date.now()) : this.disabledSnapshot();
    }

    private async runCheck(): Promise<void> {
        const startedAt = Date.now();
        const snapshot = await this.buildSnapshot(startedAt);

        this.cache = {
            snapshot,
            cachedAt: startedAt,
            expiresAt: startedAt + TALLY_STATUS_CACHE_TTL_MS,
        };
    }

    private async buildSnapshot(now: number): Promise<TallyStatusSnapshot> {
        const checkedAt = new Date(now).toISOString();
        const startedAt = Date.now();
        const configured = this.config.company;

        try {
            const companies = await this.client.listCompanies({ readTimeoutMs: TALLY_STATUS_CHECK_TIMEOUT_MS });
            const latencyMs = Date.now() - startedAt;
            const companyOpen = companies.length > 0;
            const loaded = configured ? companies.includes(configured) : false;
            const caseOnly = !loaded && configured ? companies.some(name => namesEqual(name, configured)) : false;
            const company: TallyStatusCompany = {
                configured,
                open: companyOpen,
                loaded,
                loadedCompanies: companies,
            };

            this.lastCompany = company;

            const base = this.baseSnapshot(checkedAt, latencyMs, company);

            if (!companyOpen) {
                return this.degraded(base, "COMPANY_NOT_OPEN", "No company is open in TallyPrime.");
            }

            if (!loaded) {
                return caseOnly
                    ? this.degraded(base, "COMPANY_CASE_MISMATCH", "Configured company differs only by case from the loaded company.")
                    : this.degraded(base, "COMPANY_NOT_LOADED", "Configured company is not loaded in TallyPrime.");
            }

            const groups = await this.client.exportMasters("group", { readTimeoutMs: TALLY_STATUS_CHECK_TIMEOUT_MS });

            if (groups.length === 0) {
                return this.degraded(base, "COMPANY_EMPTY", "Configured company is open but returned no masters.");
            }

            this.lastSuccessAt = checkedAt;
            this.lastFailure = null;

            return {
                ...base,
                status: "ok",
                message: "Connected; configured company is loaded.",
                lastSuccessAt: this.lastSuccessAt,
                lastFailure: null,
            };
        } catch (error) {
            return this.failureSnapshot(error, checkedAt, Date.now() - startedAt);
        }
    }

    private baseSnapshot(checkedAt: string, latencyMs: number, company: TallyStatusCompany): TallyStatusSnapshot {
        return {
            status: "ok",
            message: "",
            checkedAt,
            stale: false,
            cache: { ttlSeconds: TALLY_STATUS_CACHE_TTL_MS / 1000, ageSeconds: 0 },
            connection: {
                enabled: true,
                reachable: true,
                authOk: true,
                latencyMs,
                host: this.host(),
            },
            company,
            limits: this.limits(),
            lastSuccessAt: this.lastSuccessAt,
            lastFailure: this.lastFailure,
        };
    }

    private degraded(base: TallyStatusSnapshot, code: string, message: string): TallyStatusSnapshot {
        const failure: TallyStatusFailure = { code, message, at: base.checkedAt };

        this.lastFailure = failure;
        this.logger.warn("Tally status check degraded", { code });

        return { ...base, status: "degraded", message, lastFailure: failure };
    }

    private failureSnapshot(error: unknown, checkedAt: string, latencyMs: number): TallyStatusSnapshot {
        const mapped = mapError(error);
        const failure: TallyStatusFailure = { code: mapped.code, message: mapped.message, at: checkedAt };

        this.lastFailure = failure;
        this.logger.warn("Tally status check failed", { code: mapped.code, status: mapped.status });

        return {
            status: mapped.status,
            message: mapped.message,
            checkedAt,
            stale: this.lastCompany !== null,
            cache: { ttlSeconds: TALLY_STATUS_CACHE_TTL_MS / 1000, ageSeconds: 0 },
            connection: {
                enabled: true,
                reachable: mapped.reachable,
                authOk: mapped.authOk,
                latencyMs,
                host: this.host(),
            },
            company: this.lastCompany ?? {
                configured: this.config.company,
                open: false,
                loaded: false,
                loadedCompanies: [],
            },
            limits: this.limits(),
            lastSuccessAt: this.lastSuccessAt,
            lastFailure: failure,
        };
    }

    private disabledSnapshot(): TallyStatusSnapshot {
        return {
            status: "disabled",
            message: "Tally integration is disabled (TALLY_ENABLED=false).",
            checkedAt: new Date(Date.now()).toISOString(),
            stale: false,
            cache: { ttlSeconds: TALLY_STATUS_CACHE_TTL_MS / 1000, ageSeconds: 0 },
            connection: {
                enabled: false,
                reachable: false,
                authOk: false,
                latencyMs: null,
                host: this.host(),
            },
            company: this.lastCompany ?? {
                configured: this.config.company,
                open: false,
                loaded: false,
                loadedCompanies: [],
            },
            limits: this.limits(),
            lastSuccessAt: this.lastSuccessAt,
            lastFailure: this.lastFailure,
        };
    }

    private withAge(cache: CachedStatus, now: number): TallyStatusSnapshot {
        return {
            ...cache.snapshot,
            cache: {
                ttlSeconds: TALLY_STATUS_CACHE_TTL_MS / 1000,
                ageSeconds: Math.max(0, Math.floor((now - cache.cachedAt) / 1000)),
            },
        };
    }

    private limits(): TallyStatusLimits {
        return {
            rateLimitRps: this.config.rateLimitRps,
            maxConcurrency: this.config.maxConcurrency,
            connectTimeoutMs: this.config.connectTimeoutMs,
            httpTimeoutMs: this.config.httpTimeoutMs,
        };
    }

    private host(): string | null {
        if (!this.config.baseUrl) {
            return null;
        }

        try {
            return new URL(this.config.baseUrl).hostname;
        } catch {
            return null;
        }
    }
}
