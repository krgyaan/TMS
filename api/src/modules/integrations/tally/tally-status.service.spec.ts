import type { TallyClient, TallyLogger } from "./client/tally.client";
import { TallyAuthError, TallyLineError, TallyProtocolError, TallyTimeout, TallyUnreachable } from "./errors/tally.errors";
import type { TallyMasterRecord } from "./xml/response-parser";
import { TALLY_STATUS_CACHE_TTL_MS, TALLY_STATUS_CHECK_TIMEOUT_MS, TallyStatusService } from "./tally-status.service";
import { TallyConfig } from "@/config/tally.config";

const baseConfig: TallyConfig = {
    enabled: true,
    baseUrl: "https://tally.example.com:25989",
    authToken: "secret-token-value",
    company: "VEPL 2025-26",
    connectTimeoutMs: 5000,
    httpTimeoutMs: 30000,
    rateLimitRps: 2,
    maxConcurrency: 1,
    maxRetries: 3,
    retryBaseDelayMs: 500,
};

interface CallOptions {
    readTimeoutMs?: number;
}

function buildService(config: TallyConfig = baseConfig) {
    const listCompanies = jest.fn<Promise<string[]>, [CallOptions?]>();
    const exportMasters = jest.fn<Promise<TallyMasterRecord[]>, [string, CallOptions?]>();
    const logger: TallyLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const client = { listCompanies, exportMasters } as unknown as TallyClient;
    const service = new TallyStatusService(config, client, logger);

    return { service, listCompanies, exportMasters, logger };
}

describe("TallyStatusService", () => {
    let now = 1_700_000_000_000;

    beforeEach(() => {
        now = 1_700_000_000_000;
        jest.spyOn(Date, "now").mockImplementation(() => now);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("reports disabled without calling Tally or leaking the token", async () => {
        const { service, listCompanies } = buildService({
            ...baseConfig,
            enabled: false,
            baseUrl: null,
            authToken: null,
            company: null,
        });

        const status = await service.getStatus();

        expect(status.status).toBe("disabled");
        expect(status.connection.enabled).toBe(false);
        expect(status.company.loadedCompanies).toEqual([]);
        expect(listCompanies).not.toHaveBeenCalled();
        expect(JSON.stringify(status)).not.toContain("secret-token-value");
    });

    it("reports ok when the configured company is loaded and returns masters", async () => {
        const { service, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["VEPL 2025-26", "Other Co"]);
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null }]);

        const status = await service.getStatus();

        expect(status.status).toBe("ok");
        expect(status.connection).toMatchObject({
            enabled: true,
            reachable: true,
            authOk: true,
            host: "tally.example.com",
        });
        expect(status.company).toEqual({
            configured: "VEPL 2025-26",
            open: true,
            loaded: true,
            loadedCompanies: ["VEPL 2025-26", "Other Co"],
        });
        expect(status.lastSuccessAt).toBe(new Date(now).toISOString());
        expect(status.lastFailure).toBeNull();
        expect(listCompanies).toHaveBeenCalledWith({ readTimeoutMs: TALLY_STATUS_CHECK_TIMEOUT_MS });
        expect(exportMasters).toHaveBeenCalledWith("group", { readTimeoutMs: TALLY_STATUS_CHECK_TIMEOUT_MS });
    });

    it("reports a company that is not loaded", async () => {
        const { service, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["Other Co"]);

        const status = await service.getStatus();

        expect(status.status).toBe("degraded");
        expect(status.company.loaded).toBe(false);
        expect(status.lastFailure?.code).toBe("COMPANY_NOT_LOADED");
        expect(exportMasters).not.toHaveBeenCalled();
    });

    it("reports a case-only company mismatch", async () => {
        const { service, listCompanies } = buildService();

        listCompanies.mockResolvedValue(["vepl 2025-26"]);

        const status = await service.getStatus();

        expect(status.status).toBe("degraded");
        expect(status.lastFailure?.code).toBe("COMPANY_CASE_MISMATCH");
        expect(status.message).toMatch(/case/);
    });

    it("reports when no company is open", async () => {
        const { service, listCompanies } = buildService();

        listCompanies.mockResolvedValue([]);

        const status = await service.getStatus();

        expect(status.status).toBe("degraded");
        expect(status.company.open).toBe(false);
        expect(status.lastFailure?.code).toBe("COMPANY_NOT_OPEN");
    });

    it("reports an open company that returns no masters", async () => {
        const { service, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["VEPL 2025-26"]);
        exportMasters.mockResolvedValue([]);

        const status = await service.getStatus();

        expect(status.status).toBe("degraded");
        expect(status.lastFailure?.code).toBe("COMPANY_EMPTY");
    });

    it("maps auth failures to down with auth rejected", async () => {
        const { service, listCompanies } = buildService();

        listCompanies.mockRejectedValue(new TallyAuthError("Tally rejected the request (HTTP 401). Check TALLY_AUTH_TOKEN."));

        const status = await service.getStatus();

        expect(status.status).toBe("down");
        expect(status.connection).toMatchObject({ reachable: true, authOk: false });
        expect(status.lastFailure?.code).toBe("AUTH");
    });

    it("maps unreachable and timeout failures to down", async () => {
        const unreachable = buildService();
        unreachable.listCompanies.mockRejectedValue(new TallyUnreachable("down"));
        await expect(unreachable.service.getStatus()).resolves.toMatchObject({
            status: "down",
            connection: { reachable: false },
            lastFailure: { code: "UNREACHABLE" },
        });

        const timeout = buildService();
        timeout.listCompanies.mockRejectedValue(new TallyTimeout("slow"));
        await expect(timeout.service.getStatus()).resolves.toMatchObject({
            status: "down",
            lastFailure: { code: "TIMEOUT" },
        });
    });

    it("maps protocol failures to degraded", async () => {
        const { service, listCompanies } = buildService();

        listCompanies.mockRejectedValue(new TallyProtocolError("Tally returned an HTML page instead of an XML envelope"));

        const status = await service.getStatus();

        expect(status.status).toBe("degraded");
        expect(status.lastFailure?.code).toBe("PROTOCOL");
    });

    it("never echoes raw Tally text", async () => {
        const { service, listCompanies } = buildService();

        listCompanies.mockRejectedValue(new TallyLineError("Ledger 'Secret Ledger' does not exist"));

        const status = await service.getStatus();

        expect(JSON.stringify(status)).not.toContain("Secret Ledger");
        expect(status.lastFailure?.message).toBe("TallyPrime returned an unexpected response.");
    });

    it("serves one check from cache for the whole TTL", async () => {
        const { service, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["VEPL 2025-26"]);
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null }]);

        const first = await service.getStatus();

        expect(first.cache.ageSeconds).toBe(0);

        now += 30_000;

        const cached = await service.getStatus();

        expect(cached.cache.ageSeconds).toBe(30);
        expect(listCompanies).toHaveBeenCalledTimes(1);

        now += TALLY_STATUS_CACHE_TTL_MS;

        await service.getStatus();

        expect(listCompanies).toHaveBeenCalledTimes(2);
    });

    it("shares one in-flight check between concurrent callers", async () => {
        const { service, listCompanies, exportMasters } = buildService();
        let resolveList: (value: string[]) => void = () => undefined;

        listCompanies.mockImplementation(
            () =>
                new Promise<string[]>(resolve => {
                    resolveList = resolve;
                })
        );
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null }]);

        const first = service.getStatus();
        const second = service.getStatus();

        expect(listCompanies).toHaveBeenCalledTimes(1);

        resolveList(["VEPL 2025-26"]);

        const [a, b] = await Promise.all([first, second]);

        expect(a.status).toBe("ok");
        expect(b.status).toBe("ok");
        expect(listCompanies).toHaveBeenCalledTimes(1);
    });

    it("keeps the last known company data when a refresh fails", async () => {
        const { service, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["VEPL 2025-26", "Other Co"]);
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null }]);

        const ok = await service.getStatus();

        now += TALLY_STATUS_CACHE_TTL_MS + 1;
        listCompanies.mockRejectedValue(new TallyUnreachable("down"));

        const failed = await service.getStatus();

        expect(failed.status).toBe("down");
        expect(failed.stale).toBe(true);
        expect(failed.company.loadedCompanies).toEqual(["VEPL 2025-26", "Other Co"]);
        expect(failed.lastSuccessAt).toBe(ok.lastSuccessAt);
        expect(failed.lastFailure?.code).toBe("UNREACHABLE");
    });
});
