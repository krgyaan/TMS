import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { randomUUID } from "node:crypto";
import type { TallyConfig } from "@config/tally.config";
import {
    isTallyError,
    TallyAuthError,
    TallyCompanyMismatch,
    TallyCompanyNotOpen,
    TallyDisabledError,
    TallyError,
    TallyProtocolError,
    TallyRateLimited,
    TallyTimeout,
    TallyUnreachable,
} from "../errors/tally.errors";
import { namesEqual } from "../masters/name.util";
import { buildMasterCollectionRequest, type MasterKind } from "../xml/master-xml.builder";
import {
    parseCompanyNames,
    parseImportResult,
    parseLivenessBanner,
    parseMasterList,
    type ParseImportOptions,
    type TallyImportResult,
    type TallyLiveness,
    type TallyMasterRecord,
} from "../xml/response-parser";
import { buildCollectionExportRequest, buildImportMastersRequest } from "../xml/xml-builder";
import { TALLY_CONFIG, TALLY_REQUESTER } from "../tally.constants";
import type { TallyRequester } from "../transport/tally-http.transport";

export const MAX_TALLY_RESPONSE_BYTES = 5 * 1024 * 1024;

export interface TallyLogger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}

export interface TallyHealth {
    enabled: boolean;
    reachable: boolean;
    companyOpen: boolean;
    companyMatches: boolean;
    latencyMs: number;
    companies: string[];
    error?: string;
}

export interface TallyCallOptions {
    /** Overrides TALLY_HTTP_TIMEOUT_MS for a single call (used by status checks). */
    readTimeoutMs?: number;
}

interface ResolvedConfig {
    baseUrl: string;
    authToken: string;
    company: string;
}

@Injectable()
export class TallyClient {
    constructor(
        @Inject(TALLY_CONFIG) private readonly config: TallyConfig,
        @Inject(TALLY_REQUESTER) private readonly requester: TallyRequester,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: TallyLogger
    ) {}

    /** Never throws: intended for health checks and operator dashboards. */
    async health(): Promise<TallyHealth> {
        if (!this.config.enabled) {
            return {
                enabled: false,
                reachable: false,
                companyOpen: false,
                companyMatches: false,
                latencyMs: 0,
                companies: [],
                error: "Tally integration is disabled (TALLY_ENABLED=false)",
            };
        }

        const startedAt = Date.now();

        try {
            const companies = await this.listCompanies();
            const company = this.config.company;
            const companyOpen = companies.length > 0;
            const companyMatches = company ? companies.includes(company) : false;
            const caseOnlyMatch = !companyMatches && company ? companies.some(name => namesEqual(name, company)) : false;

            let error: string | undefined;

            if (!companyOpen) {
                error = "No company is open in TallyPrime";
            } else if (!companyMatches) {
                error = caseOnlyMatch ? `TALLY_COMPANY "${company}" matches a loaded company only when case is ignored` : `TALLY_COMPANY "${company}" is not loaded in TallyPrime`;
            }

            return {
                enabled: true,
                reachable: true,
                companyOpen,
                companyMatches,
                latencyMs: Date.now() - startedAt,
                companies,
                error,
            };
        } catch (error) {
            const tallyError = this.normaliseError(error);
            const reachable = !(tallyError instanceof TallyUnreachable || tallyError instanceof TallyTimeout);

            return {
                enabled: true,
                reachable,
                companyOpen: false,
                companyMatches: false,
                latencyMs: Date.now() - startedAt,
                companies: [],
                error: tallyError.message,
            };
        }
    }

    /** Lightweight reachability probe. Throws on failure. */
    async ping(options: TallyCallOptions = {}): Promise<void> {
        await this.listCompanies(options);
    }

    /**
     * Probes the proxy's liveness banner with an empty POST. Confirms the server
     * is running without requiring a company to be open.
     */
    async checkLiveness(options: TallyCallOptions = {}): Promise<TallyLiveness> {
        this.requireConfig();

        const response = await this.post("liveness", "", options);

        return parseLivenessBanner(response.xml);
    }

    async listCompanies(options: TallyCallOptions = {}): Promise<string[]> {
        this.requireConfig();

        const xml = buildCollectionExportRequest({
            collectionName: "List of Companies",
            objectType: "Company",
            nativeMethods: ["Name"],
        });
        const response = await this.post("listCompanies", xml, options);

        return parseCompanyNames(response.xml);
    }

    /**
     * Confirms TALLY_COMPANY is loaded. The company list can include companies
     * that are configured but not open, so a company-scoped probe follows.
     */
    async assertCompanyLoaded(): Promise<void> {
        const { company } = this.requireConfig();
        const companies = await this.listCompanies();

        if (companies.length === 0) {
            throw new TallyCompanyNotOpen("No company is open in TallyPrime; open the company configured in TALLY_COMPANY");
        }

        if (!companies.includes(company)) {
            const nearMatch = companies.find(name => namesEqual(name, company));

            throw new TallyCompanyMismatch(
                nearMatch ? `TALLY_COMPANY "${company}" differs only in case from the loaded company "${nearMatch}"` : `TALLY_COMPANY "${company}" is not loaded in TallyPrime`,
                { details: { loadedCompanies: companies } }
            );
        }

        const groups = await this.exportMasters("group");

        if (groups.length === 0) {
            throw new TallyCompanyNotOpen(`Company "${company}" returned no masters; open it in TallyPrime and retry`);
        }
    }

    async exportMasters(kind: MasterKind, options: TallyCallOptions = {}): Promise<TallyMasterRecord[]> {
        const { company } = this.requireConfig();
        const xml = buildMasterCollectionRequest(kind, { company });
        const response = await this.post(`list:${kind}`, xml, options);

        return parseMasterList(response.xml, kind);
    }

    async importMasters(messages: string[], options: ParseImportOptions = {}): Promise<TallyImportResult> {
        const { company } = this.requireConfig();
        const xml = buildImportMastersRequest(messages, { company });
        const response = await this.post("importMasters", xml);

        return parseImportResult(response.xml, options);
    }

    private requireConfig(): ResolvedConfig {
        if (!this.config.enabled || !this.config.baseUrl || !this.config.authToken || !this.config.company) {
            throw new TallyDisabledError();
        }

        return {
            baseUrl: this.config.baseUrl,
            authToken: this.config.authToken,
            company: this.config.company,
        };
    }

    private async post(operation: string, xml: string, options: TallyCallOptions = {}): Promise<{ xml: string; statusCode: number }> {
        const { baseUrl, authToken } = this.requireConfig();
        const requestId = randomUUID();
        const startedAt = Date.now();
        let httpStatus: number | undefined;

        try {
            const response = await this.requester({
                url: new URL(baseUrl),
                body: xml,
                headers: {
                    "Content-Type": "text/xml; charset=utf-8",
                    Accept: "text/xml, application/xml",
                    "Accept-Encoding": "identity",
                    Authorization: `Bearer ${authToken}`,
                },
                connectTimeoutMs: this.config.connectTimeoutMs,
                readTimeoutMs: options.readTimeoutMs ?? this.config.httpTimeoutMs,
                maxResponseBytes: MAX_TALLY_RESPONSE_BYTES,
            });

            httpStatus = response.statusCode;

            this.assertHttpStatus(response.statusCode);

            this.logger.info("Tally request completed", {
                requestId,
                operation,
                durationMs: Date.now() - startedAt,
                httpStatus,
                outcome: "ok",
            });

            return { xml: response.body, statusCode: response.statusCode };
        } catch (error) {
            const tallyError = this.normaliseError(error);

            this.logger.error("Tally request failed", {
                requestId,
                operation,
                durationMs: Date.now() - startedAt,
                httpStatus: httpStatus ?? tallyError.details?.statusCode,
                outcome: tallyError.code,
                error: tallyError.message,
            });

            throw tallyError;
        }
    }

    private assertHttpStatus(statusCode: number): void {
        if (statusCode >= 200 && statusCode <= 299) {
            return;
        }

        if (statusCode === 401 || statusCode === 403) {
            throw new TallyAuthError(`Tally rejected the request (HTTP ${statusCode}). Check TALLY_AUTH_TOKEN.`, {
                details: { statusCode },
            });
        }

        if (statusCode === 429) {
            throw new TallyRateLimited("Tally rate-limited the request (HTTP 429)", { details: { statusCode } });
        }

        if (statusCode === 408 || statusCode === 504) {
            throw new TallyTimeout(`Tally request timed out (HTTP ${statusCode})`, { details: { statusCode } });
        }

        if (statusCode === 503) {
            throw new TallyUnreachable("Tally is unavailable (HTTP 503)", { details: { statusCode } });
        }

        throw new TallyProtocolError(`Tally returned an unexpected HTTP status ${statusCode}`, {
            details: { statusCode },
        });
    }

    private normaliseError(error: unknown): TallyError {
        if (isTallyError(error)) {
            return error;
        }

        if (error instanceof Error) {
            if (error.name === "AbortError" || /timed? ?out/i.test(error.message)) {
                return new TallyTimeout("Tally request timed out", { cause: error });
            }

            return new TallyUnreachable("Tally request failed", { cause: error });
        }

        return new TallyUnreachable("Tally request failed");
    }
}
