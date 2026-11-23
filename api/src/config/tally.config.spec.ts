jest.mock("node:fs", () => {
    const actual = jest.requireActual<typeof import("node:fs")>("node:fs");

    return { ...actual, statSync: jest.fn(), readFileSync: jest.fn() };
});

jest.mock("node:tls", () => {
    const actual = jest.requireActual<typeof import("node:tls")>("node:tls");

    return { ...actual, createSecureContext: jest.fn() };
});

import * as fs from "node:fs";
import * as tls from "node:tls";
import { parseTallyEnv, validateTallyEnv } from "./tally.config";

const statSyncMock = fs.statSync as unknown as jest.Mock;
const readFileSyncMock = fs.readFileSync as unknown as jest.Mock;
const createSecureContextMock = tls.createSecureContext as unknown as jest.Mock;

const enabledEnv: Record<string, unknown> = {
    TALLY_ENABLED: "true",
    TALLY_BASE_URL: "https://tally.example.com:25989/",
    TALLY_AUTH_TOKEN: "super-secret-token",
    TALLY_COMPANY: "VEPL 2025-26",
};

describe("parseTallyEnv", () => {
    beforeEach(() => {
        statSyncMock.mockReset();
        readFileSyncMock.mockReset();
        createSecureContextMock.mockReset();
    });

    it("is inert and needs no Tally variables when disabled", () => {
        const config = parseTallyEnv({});

        expect(config.enabled).toBe(false);
        expect(config.baseUrl).toBeNull();
        expect(config.company).toBeNull();
        expect(config.rateLimitRps).toBe(2);
        expect(config.maxConcurrency).toBe(1);
        expect(config.maxRetries).toBe(3);
        expect(config.retryBaseDelayMs).toBe(500);
    });

    it("parses enabled config and strips trailing slashes", () => {
        const config = parseTallyEnv(enabledEnv);

        expect(config.enabled).toBe(true);
        expect(config.baseUrl).toBe("https://tally.example.com:25989");
        expect(config.authToken).toBe("super-secret-token");
        expect(config.company).toBe("VEPL 2025-26");
        expect(config.caCertificate).toBeNull();
    });

    it("applies numeric overrides", () => {
        const config = parseTallyEnv({
            ...enabledEnv,
            TALLY_RATE_LIMIT_RPS: "0.5",
            TALLY_MAX_CONCURRENCY: "2",
            TALLY_MAX_RETRIES: "0",
            TALLY_CONNECT_TIMEOUT_MS: "1500",
        });

        expect(config.rateLimitRps).toBe(0.5);
        expect(config.maxConcurrency).toBe(2);
        expect(config.maxRetries).toBe(0);
        expect(config.connectTimeoutMs).toBe(1500);
    });

    it("names the missing variable when enabled", () => {
        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_COMPANY: "   " })).toThrow(/TALLY_COMPANY/);
        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_AUTH_TOKEN: "" })).toThrow(/TALLY_AUTH_TOKEN/);
        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_BASE_URL: "" })).toThrow(/TALLY_BASE_URL/);
    });

    it("rejects non-HTTPS base URLs", () => {
        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_BASE_URL: "http://tally.local:9000" })).toThrow(/https:\/\//);
    });

    it("rejects credentials, query strings and fragments in the URL", () => {
        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_BASE_URL: "https://user:pass@tally.example.com" })).toThrow(/credentials/);
        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_BASE_URL: "https://tally.example.com/?a=1" })).toThrow(/query string/);
        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_BASE_URL: "https://tally.example.com/#frag" })).toThrow(/query string/);
    });

    it("never echoes the token in error messages", () => {
        try {
            parseTallyEnv({ ...enabledEnv, TALLY_BASE_URL: "http://insecure.example.com" });
            throw new Error("expected parseTallyEnv to throw");
        } catch (error) {
            expect(String(error)).not.toContain("super-secret-token");
        }
    });

    it("loads and validates a private CA certificate", () => {
        const caPem = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n";

        statSyncMock.mockReturnValue({ isFile: () => true, size: caPem.length });
        readFileSyncMock.mockReturnValue(caPem);
        createSecureContextMock.mockReturnValue({});

        const config = parseTallyEnv({ ...enabledEnv, TALLY_CA_CERT_PATH: "/etc/tms/certs/caddy-root.crt" });

        expect(config.caCertificate).toBe(caPem);
        expect(createSecureContextMock).toHaveBeenCalledWith({ ca: caPem });
    });

    it("requires an absolute CA path", () => {
        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_CA_CERT_PATH: "certs/ca.crt" })).toThrow(/absolute/);
    });

    it("rejects an unreadable CA file", () => {
        statSyncMock.mockImplementation(() => {
            throw new Error("ENOENT");
        });

        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_CA_CERT_PATH: "/missing/ca.crt" })).toThrow(/could not be read/);
    });

    it("rejects a non-PEM CA file", () => {
        statSyncMock.mockReturnValue({ isFile: () => true, size: 8 });
        readFileSyncMock.mockReturnValue("not a cert");

        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_CA_CERT_PATH: "/etc/ca.crt" })).toThrow(/PEM certificate/);
    });

    it("rejects an oversize CA file", () => {
        statSyncMock.mockReturnValue({ isFile: () => true, size: 100_000 });

        expect(() => parseTallyEnv({ ...enabledEnv, TALLY_CA_CERT_PATH: "/etc/ca.crt" })).toThrow(/65536/);
    });

    it("validateTallyEnv returns an empty object when disabled", () => {
        expect(validateTallyEnv({})).toEqual({});
    });

    it("validateTallyEnv fails fast when enabled and invalid", () => {
        expect(() => validateTallyEnv({ ...enabledEnv, TALLY_BASE_URL: "not-a-url" })).toThrow(/TALLY_BASE_URL/);
    });
});
