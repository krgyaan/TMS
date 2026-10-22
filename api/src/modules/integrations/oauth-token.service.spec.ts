import { ConfigService } from "@nestjs/config";
import { sql, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { DbInstance } from "@/db";
import { OAuthTokenService } from "./oauth-token.service";

describe("OAuthTokenService", () => {
    it("scopes token lookup by user and provider", async () => {
        const account = {
            id: 12,
            accessToken: "user-token",
            refreshToken: null,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            isActive: true,
        };
        const limit = jest.fn().mockResolvedValue([account]);
        let whereCondition: SQL<unknown> = sql``;
        const where = jest.fn((condition: SQL<unknown>) => {
            whereCondition = condition;
            return { limit };
        });
        const from = jest.fn().mockReturnValue({ where });
        const select = jest.fn().mockReturnValue({ from });
        const database = { select } as unknown as DbInstance;
        const config = { get: jest.fn().mockReturnValue("test-value") } as unknown as ConfigService;
        const service = new OAuthTokenService(database, config);

        const token = await service.getValidToken(42, "google");
        const query = new PgDialect().sqlToQuery(whereCondition);

        expect(token?.accessToken).toBe("user-token");
        expect(query.params).toEqual([42, "google"]);
    });
});
