import { parseTallyEnv, validateTallyEnv } from "./tally.config";

const enabledEnv: Record<string, unknown> = {
    TALLY_ENABLED: "true",
    TALLY_BASE_URL: "https://tally.example.com:25989/",
    TALLY_AUTH_TOKEN: "super-secret-token",
    TALLY_COMPANY: "VEPL 2025-26",
};

describe("parseTallyEnv", () => {
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

    it("validateTallyEnv returns an empty object when disabled", () => {
        expect(validateTallyEnv({})).toEqual({});
    });

    it("validateTallyEnv fails fast when enabled and invalid", () => {
        expect(() => validateTallyEnv({ ...enabledEnv, TALLY_BASE_URL: "not-a-url" })).toThrow(/TALLY_BASE_URL/);
    });
});
