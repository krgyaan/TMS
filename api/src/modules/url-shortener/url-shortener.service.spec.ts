import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE } from "@/db/database.module";
import { UrlShortenerService } from "./url-shortener.service";

describe("UrlShortenerService", () => {
    let service: UrlShortenerService;

    const PUBLIC_APP_URL = "https://tms.example.com";

    let insertReturning: jest.Mock;
    let selectWhereLimit: jest.Mock;
    let updateSetWhere: jest.Mock;
    let deleteWhere: jest.Mock;

    beforeEach(async () => {
        insertReturning = jest.fn();
        selectWhereLimit = jest.fn();
        updateSetWhere = jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) }));
        deleteWhere = jest.fn().mockResolvedValue(undefined);

        const dbMock = {
            insert: jest.fn(() => ({ values: jest.fn(() => ({ returning: insertReturning })) })),
            select: jest.fn(() => ({ from: jest.fn(() => ({ where: jest.fn(() => ({ limit: selectWhereLimit })) })) })),
            update: jest.fn(() => ({ set: updateSetWhere })),
            delete: jest.fn(() => ({ where: deleteWhere })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UrlShortenerService,
                { provide: DRIZZLE, useValue: dbMock },
                { provide: ConfigService, useValue: { get: (key: string) => (key === "app.publicAppUrl" ? PUBLIC_APP_URL : undefined) } },
            ],
        }).compile();

        service = module.get(UrlShortenerService);
    });

    describe("shorten", () => {
        it("returns a /n/<12-char token> URL and stores the target URL", async () => {
            insertReturning.mockResolvedValueOnce([{ id: 1 }]);

            const url = await service.shorten("https://tms.example.com/notify/abc.jwt", { purpose: "wa-notify" });

            expect(url).toMatch(new RegExp(`^${PUBLIC_APP_URL}/n/[A-Za-z0-9_-]{12}$`));
            expect(insertReturning).toHaveBeenCalledTimes(1);
        });

        it("retries when the generated token collides", async () => {
            insertReturning.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 2 }]);

            const url = await service.shorten("https://example.com/x");

            expect(url).toMatch(new RegExp(`^${PUBLIC_APP_URL}/n/[A-Za-z0-9_-]{12}$`));
            expect(insertReturning).toHaveBeenCalledTimes(2);
        });

        it("gives up after exhausting collision attempts", async () => {
            insertReturning.mockResolvedValue([]);

            await expect(service.shorten("https://example.com/x")).rejects.toThrow(/unique short-link token/);
        });
    });

    describe("resolve", () => {
        it("returns the stored URL for a live token", async () => {
            selectWhereLimit.mockResolvedValueOnce([{ url: "https://tms.example.com/notify/abc.jwt", expiresAt: new Date(Date.now() + 60_000) }]);

            await expect(service.resolve("abc123XYZ789")).resolves.toEqual({ url: "https://tms.example.com/notify/abc.jwt" });
            expect(updateSetWhere).toHaveBeenCalledTimes(1);
        });

        it("returns null for an unknown token", async () => {
            selectWhereLimit.mockResolvedValueOnce([]);

            await expect(service.resolve("nope12345678")).resolves.toBeNull();
            expect(updateSetWhere).not.toHaveBeenCalled();
        });

        it("returns null for an expired token", async () => {
            selectWhereLimit.mockResolvedValueOnce([{ url: "https://example.com/x", expiresAt: new Date(Date.now() - 1000) }]);

            await expect(service.resolve("expiredtoken1")).resolves.toBeNull();
            expect(updateSetWhere).not.toHaveBeenCalled();
        });

        it("returns null for an empty token", async () => {
            await expect(service.resolve("")).resolves.toBeNull();
            expect(selectWhereLimit).not.toHaveBeenCalled();
        });
    });

    describe("resolveOrThrow", () => {
        it("throws NotFoundException for missing/expired tokens", async () => {
            selectWhereLimit.mockResolvedValueOnce([]);

            await expect(service.resolveOrThrow("bad")).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
