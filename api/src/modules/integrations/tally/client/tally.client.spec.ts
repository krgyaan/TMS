import type { TallyConfig } from "../../../../config/tally.config";
import { TallyAuthError, TallyCompanyMismatch, TallyCompanyNotOpen, TallyDisabledError, TallyProtocolError, TallyRateLimited, TallyUnreachable } from "../errors/tally.errors";
import type { TallyHttpRequest, TallyHttpResponse, TallyRequester } from "../transport/tally-http.transport";
import { TallyClient, type TallyLogger } from "./tally.client";

const baseConfig: TallyConfig = {
    enabled: true,
    baseUrl: "https://tally.example.com:25989",
    authToken: "secret-token-value",
    company: "VEPL 2025-26",
    connectTimeoutMs: 1000,
    httpTimeoutMs: 2000,
    rateLimitRps: 2,
    maxConcurrency: 1,
    maxRetries: 3,
    retryBaseDelayMs: 500,
};

const xmlResponse = (body: string, statusCode = 200): TallyHttpResponse => ({
    statusCode,
    headers: { "content-type": "text/xml" },
    body,
});

const envelope = (body: string, status = "1"): string => `<ENVELOPE><HEADER><VERSION>1</VERSION><STATUS>${status}</STATUS></HEADER><BODY>${body}</BODY></ENVELOPE>`;

const companiesResponse = (names: string[]): TallyHttpResponse =>
    xmlResponse(envelope(`<DATA><COLLECTION>${names.map(name => `<COMPANY NAME="${name}"><NAME>${name}</NAME></COMPANY>`).join("")}</COLLECTION></DATA>`));

function buildClient(responses: TallyHttpResponse | TallyHttpResponse[], config: TallyConfig = baseConfig) {
    const calls: TallyHttpRequest[] = [];
    const logs: Array<{ level: string; message: string; meta?: Record<string, unknown> }> = [];
    const queue = Array.isArray(responses) ? [...responses] : null;
    const fixed = Array.isArray(responses) ? null : responses;

    const requester: TallyRequester = request => {
        calls.push(request);

        if (fixed) {
            return Promise.resolve(fixed);
        }

        const next = queue?.shift();

        if (!next) {
            return Promise.reject(new Error("No fake response queued"));
        }

        return Promise.resolve(next);
    };

    const logger: TallyLogger = {
        info: (message, meta) => logs.push({ level: "info", message, meta }),
        warn: (message, meta) => logs.push({ level: "warn", message, meta }),
        error: (message, meta) => logs.push({ level: "error", message, meta }),
    };

    return { client: new TallyClient(config, requester, logger), calls, logs };
}

function buildFailingClient(error: Error, config: TallyConfig = baseConfig) {
    const requester: TallyRequester = () => Promise.reject(error);
    const logger: TallyLogger = { info: () => {}, warn: () => {}, error: () => {} };

    return new TallyClient(config, requester, logger);
}

describe("TallyClient", () => {
    it("is inert when disabled", async () => {
        const { client } = buildClient(companiesResponse([]), {
            ...baseConfig,
            enabled: false,
            baseUrl: null,
            authToken: null,
            company: null,
        });

        await expect(client.listCompanies()).rejects.toBeInstanceOf(TallyDisabledError);

        const health = await client.health();

        expect(health.enabled).toBe(false);
        expect(health.error).toMatch(/disabled/);
    });

    it("sends the bearer token and content type without logging them", async () => {
        const { client, calls, logs } = buildClient(companiesResponse(["VEPL 2025-26"]));

        await client.listCompanies();

        expect(calls).toHaveLength(1);
        expect(calls[0].headers.Authorization).toBe("Bearer secret-token-value");
        expect(calls[0].headers["Content-Type"]).toContain("text/xml");
        expect(calls[0].url.hostname).toBe("tally.example.com");

        const serialized = JSON.stringify(logs);

        expect(serialized).not.toContain("secret-token-value");
        expect(serialized).not.toContain("<ENVELOPE");
        expect(serialized).toContain("listCompanies");
        expect(serialized).toContain("requestId");
    });

    it("parses the company list", async () => {
        const { client } = buildClient(companiesResponse(["VEPL 2025-26", "Other Co"]));

        await expect(client.listCompanies()).resolves.toEqual(["VEPL 2025-26", "Other Co"]);
    });

    it("passes a per-call read timeout override", async () => {
        const { client, calls } = buildClient(companiesResponse(["VEPL 2025-26"]));

        await client.listCompanies({ readTimeoutMs: 1234 });

        expect(calls[0].readTimeoutMs).toBe(1234);
    });

    it("parses an import result", async () => {
        const { client } = buildClient(
            xmlResponse(
                envelope("<DATA><IMPORTRESULT><CREATED>1</CREATED><ALTERED>0</ALTERED><IGNORED>0</IGNORED><ERRORS>0</ERRORS><CANCELLED>0</CANCELLED></IMPORTRESULT></DATA>")
            )
        );

        const result = await client.importMasters(['<LEDGER NAME="A" ACTION="Create"><NAME>A</NAME></LEDGER>']);

        expect(result.created).toBe(1);
    });

    it("parses a master export", async () => {
        const { client } = buildClient(
            xmlResponse(envelope('<DATA><TALLYMESSAGE><LEDGER NAME="Site Expenses"><NAME>Site Expenses</NAME><PARENT>Indirect Expenses</PARENT></LEDGER></TALLYMESSAGE></DATA>'))
        );

        await expect(client.exportMasters("ledger")).resolves.toEqual([{ name: "Site Expenses", parent: "Indirect Expenses" }]);
    });

    it("maps 401 and 403 to TallyAuthError with a token hint", async () => {
        const unauthorized = buildClient(xmlResponse("Unauthorized", 401));
        const forbidden = buildClient(xmlResponse("Forbidden", 403));

        await expect(unauthorized.client.listCompanies()).rejects.toBeInstanceOf(TallyAuthError);
        await expect(unauthorized.client.listCompanies()).rejects.toThrow(/TALLY_AUTH_TOKEN/);
        await expect(forbidden.client.listCompanies()).rejects.toBeInstanceOf(TallyAuthError);
    });

    it("maps 429 to a retryable TallyRateLimited", async () => {
        const { client } = buildClient(xmlResponse("slow down", 429));

        await expect(client.listCompanies()).rejects.toMatchObject({ code: "RATE_LIMITED", retryable: true });
        await expect(client.listCompanies()).rejects.toBeInstanceOf(TallyRateLimited);
    });

    it("maps 503 to a retryable TallyUnreachable", async () => {
        const { client } = buildClient(xmlResponse("unavailable", 503));

        await expect(client.listCompanies()).rejects.toBeInstanceOf(TallyUnreachable);
    });

    it("maps other non-2xx statuses to TallyProtocolError", async () => {
        const { client } = buildClient(xmlResponse("oops", 500));

        await expect(client.listCompanies()).rejects.toBeInstanceOf(TallyProtocolError);
    });

    it("reports health for a matching company", async () => {
        const { client } = buildClient(companiesResponse(["VEPL 2025-26"]));

        const health = await client.health();

        expect(health).toMatchObject({
            enabled: true,
            reachable: true,
            companyOpen: true,
            companyMatches: true,
        });
        expect(health.error).toBeUndefined();
    });

    it("reports a case-only company mismatch", async () => {
        const { client } = buildClient(companiesResponse(["vepl 2025-26"]));

        const health = await client.health();

        expect(health.companyMatches).toBe(false);
        expect(health.error).toMatch(/case/);
    });

    it("reports a missing company", async () => {
        const { client } = buildClient(companiesResponse(["Some Other Co"]));

        const health = await client.health();

        expect(health.companyMatches).toBe(false);
        expect(health.error).toMatch(/not loaded/);
    });

    it("reports unreachable health without throwing", async () => {
        const client = buildFailingClient(new TallyUnreachable("down"));

        const health = await client.health();

        expect(health.reachable).toBe(false);
        expect(health.error).toBe("down");
    });

    it("asserts the configured company is loaded", async () => {
        const { client } = buildClient([
            companiesResponse(["VEPL 2025-26"]),
            xmlResponse(envelope('<DATA><TALLYMESSAGE><GROUP NAME="Capital Account"><NAME>Capital Account</NAME></GROUP></TALLYMESSAGE></DATA>')),
        ]);

        await expect(client.assertCompanyLoaded()).resolves.toBeUndefined();
    });

    it("rejects a company that is not loaded", async () => {
        const { client } = buildClient(companiesResponse(["Other Co"]));

        await expect(client.assertCompanyLoaded()).rejects.toBeInstanceOf(TallyCompanyMismatch);
    });

    it("rejects when no company is open", async () => {
        const { client } = buildClient(companiesResponse([]));

        await expect(client.assertCompanyLoaded()).rejects.toBeInstanceOf(TallyCompanyNotOpen);
    });
});
