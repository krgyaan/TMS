import type { TallyConfig } from "@/config/tally.config";
import type { TallyClient, TallyLogger } from "./client/tally.client";
import { TallyAuthError, TallyLineError, TallyProtocolError, TallyTimeout, TallyTlsError, TallyUnreachable } from "./errors/tally.errors";
import type { TallyLiveness, TallyMasterRecord } from "./xml/response-parser";
import { TALLY_STATUS_CACHE_TTL_MS, TALLY_STATUS_CHECK_TIMEOUT_MS, TallyStatusService } from "./tally-status.service";

const baseConfig: TallyConfig = {
    enabled: true,
    baseUrl: "https://tally.example.com:25989",
    authToken: "secret-token-value",
    company: "VEPL 2025-26",
    caCertificate: null,
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

const runningBanner: TallyLiveness = { running: true, message: "TallyPrime Server is Running" };

function buildService(config: TallyConfig = baseConfig) {
    const checkLiveness = jest.fn<Promise<TallyLiveness>, [CallOptions?]>();
    const listCompanies = jest.fn<Promise<string[]>, [CallOptions?]>();
    const exportMasters = jest.fn<Promise<TallyMasterRecord[]>, [string, CallOptions?]>();
    const logger: TallyLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const client = { checkLiveness, listCompanies, exportMasters } as unknown as TallyClient;
    const service = new TallyStatusService(config, client, logger);

    checkLiveness.mockResolvedValue(runningBanner);

    return { service, checkLiveness, listCompanies, exportMasters, logger };
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
        const { service, checkLiveness, listCompanies } = buildService({
            ...baseConfig,
            enabled: false,
            baseUrl: null,
            authToken: null,
            company: null,
        });

        const status = await service.getStatus();

        expect(status.status).toBe("disabled");
        expect(status.connection).toMatchObject({ enabled: false, serverRunning: false });
        expect(status.company.loadedCompanies).toEqual([]);
        expect(checkLiveness).not.toHaveBeenCalled();
        expect(listCompanies).not.toHaveBeenCalled();
        expect(JSON.stringify(status)).not.toContain("secret-token-value");
    });

    it("reports ok when the server is running and the configured company is loaded", async () => {
        const { service, checkLiveness, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["VEPL 2025-26", "Other Co"]);
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null, guid: null }]);

        const status = await service.getStatus();

        expect(status.status).toBe("ok");
        expect(status.connection).toMatchObject({
            enabled: true,
            serverRunning: true,
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
        expect(checkLiveness).toHaveBeenCalledWith({ readTimeoutMs: TALLY_STATUS_CHECK_TIMEOUT_MS });
        expect(listCompanies).toHaveBeenCalledWith({ readTimeoutMs: TALLY_STATUS_CHECK_TIMEOUT_MS });
        expect(exportMasters).toHaveBeenCalledWith("group", { readTimeoutMs: TALLY_STATUS_CHECK_TIMEOUT_MS });
    });

    it("reports when the liveness banner is not recognised", async () => {
        const { service, checkLiveness, listCompanies } = buildService();

        checkLiveness.mockResolvedValue({ running: false, message: "Something else" });

        const status = await service.getStatus();

        expect(status.status).toBe("degraded");
        expect(status.connection.serverRunning).toBe(false);
        expect(status.lastFailure?.code).toBe("SERVER_NOT_RUNNING");
        expect(listCompanies).not.toHaveBeenCalled();
    });

    it("reports a company that is not loaded", async () => {
        const { service, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["Other Co"]);

        const status = await service.getStatus();

        expect(status.status).toBe("degraded");
        expect(status.connection.serverRunning).toBe(true);
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
        const { service, checkLiveness } = buildService();

        checkLiveness.mockRejectedValue(new TallyAuthError("Tally rejected the request (HTTP 401). Check TALLY_AUTH_TOKEN."));

        const status = await service.getStatus();

        expect(status.status).toBe("down");
        expect(status.connection).toMatchObject({ reachable: true, authOk: false, serverRunning: false });
        expect(status.lastFailure?.code).toBe("AUTH");
    });

    it("maps certificate trust failures to the TLS code", async () => {
        const { service, checkLiveness } = buildService();

        checkLiveness.mockRejectedValue(new TallyTlsError("Tally certificate chain is not trusted"));

        const status = await service.getStatus();

        expect(status.status).toBe("down");
        expect(status.connection).toMatchObject({ reachable: false, serverRunning: false });
        expect(status.lastFailure?.code).toBe("TLS");
        expect(status.message).toMatch(/Secure connection/);
    });

    it("maps unreachable and timeout failures to down", async () => {
        const unreachable = buildService();
        unreachable.checkLiveness.mockRejectedValue(new TallyUnreachable("down"));
        await expect(unreachable.service.getStatus()).resolves.toMatchObject({
            status: "down",
            connection: { reachable: false },
            lastFailure: { code: "UNREACHABLE" },
        });

        const timeout = buildService();
        timeout.checkLiveness.mockRejectedValue(new TallyTimeout("slow"));
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

    it("returns only the documented response fields", async () => {
        const { service, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["VEPL 2025-26"]);
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null, guid: null }]);

        const status = await service.getStatus();

        expect(Object.keys(status).sort()).toEqual(["checkedAt", "company", "connection", "lastFailure", "lastSuccessAt", "message", "stale", "status"].sort());
        expect(status).not.toHaveProperty("limits");
        expect(status).not.toHaveProperty("cache");
    });

    it("serves one check from cache for the whole TTL", async () => {
        const { service, checkLiveness, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["VEPL 2025-26"]);
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null, guid: null }]);

        await service.getStatus();

        now += 30_000;

        await service.getStatus();

        expect(checkLiveness).toHaveBeenCalledTimes(1);
        expect(listCompanies).toHaveBeenCalledTimes(1);

        now += TALLY_STATUS_CACHE_TTL_MS;

        await service.getStatus();

        expect(checkLiveness).toHaveBeenCalledTimes(2);
        expect(listCompanies).toHaveBeenCalledTimes(2);
    });

    it("shares one in-flight check between concurrent callers", async () => {
        const { service, checkLiveness, listCompanies, exportMasters } = buildService();
        let resolveList: (value: string[]) => void = () => undefined;

        listCompanies.mockImplementation(
            () =>
                new Promise<string[]>(resolve => {
                    resolveList = resolve;
                })
        );
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null, guid: null }]);

        const first = service.getStatus();
        const second = service.getStatus();

        await new Promise<void>(resolve => setImmediate(resolve));

        expect(checkLiveness).toHaveBeenCalledTimes(1);
        expect(listCompanies).toHaveBeenCalledTimes(1);

        resolveList(["VEPL 2025-26"]);

        const [a, b] = await Promise.all([first, second]);

        expect(a.status).toBe("ok");
        expect(b.status).toBe("ok");
        expect(listCompanies).toHaveBeenCalledTimes(1);
    });

    it("keeps the last known company data when a refresh fails", async () => {
        const { service, checkLiveness, listCompanies, exportMasters } = buildService();

        listCompanies.mockResolvedValue(["VEPL 2025-26", "Other Co"]);
        exportMasters.mockResolvedValue([{ name: "Capital Account", parent: null, guid: null }]);

        const ok = await service.getStatus();

        now += TALLY_STATUS_CACHE_TTL_MS + 1;
        checkLiveness.mockRejectedValue(new TallyUnreachable("down"));

        const failed = await service.getStatus();

        expect(failed.status).toBe("down");
        expect(failed.stale).toBe(true);
        expect(failed.connection.serverRunning).toBe(false);
        expect(failed.company.loadedCompanies).toEqual(["VEPL 2025-26", "Other Co"]);
        expect(failed.lastSuccessAt).toBe(ok.lastSuccessAt);
        expect(failed.lastFailure?.code).toBe("UNREACHABLE");
    });
});
