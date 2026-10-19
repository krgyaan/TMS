import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule, JwtService } from "@nestjs/jwt";
import authConfig from "@/config/auth.config";
import { UrlShortenerService } from "@/modules/url-shortener/url-shortener.service";
import { PublicLinkService, PUBLIC_NOTIFY_PURPOSE } from "./public-link.service";

describe("PublicLinkService", () => {
    let service: PublicLinkService;
    let jwtService: JwtService;

    const STATE_SECRET = "test-state-secret-123456";
    const PUBLIC_APP_URL = "https://tms.example.com";

    let configGet: jest.Mock;
    let shortenMock: jest.Mock;
    let storedFullUrl: string | null;

    beforeEach(async () => {
        configGet = jest.fn((key: string) => {
            if (key === "app.publicAppUrl") return PUBLIC_APP_URL;
            if (key === "app.publicLinkExpiresIn") return "30d";
            return undefined;
        });
        storedFullUrl = null;
        shortenMock = jest.fn(async (url: string) => {
            storedFullUrl = url;
            return `${PUBLIC_APP_URL}/n/abc123XYZ789`;
        });

        const module: TestingModule = await Test.createTestingModule({
            imports: [JwtModule.register({})],
            providers: [
                PublicLinkService,
                { provide: ConfigService, useValue: { get: configGet } },
                { provide: UrlShortenerService, useValue: { shorten: shortenMock } },
                {
                    provide: authConfig.KEY,
                    useValue: { stateSecret: STATE_SECRET },
                },
            ],
        }).compile();

        service = module.get(PublicLinkService);
        jwtService = module.get(JwtService);
    });

    it("signs a token carrying the entity claims and purpose", async () => {
        const token = await service.sign({ type: "po", id: 42, event: "PO Approved" });

        const claims = await service.verify(token);
        expect(claims).toMatchObject({ t: "po", id: 42, ev: "PO Approved", purpose: PUBLIC_NOTIFY_PURPOSE });
    });

    it("omits the event claim when no event is given", async () => {
        const token = await service.sign({ type: "pr", id: 7 });

        const claims = await service.verify(token);
        expect(claims.t).toBe("pr");
        expect(claims.id).toBe(7);
        expect(claims.ev).toBeUndefined();
    });

    it("builds a shortened public URL under /n/ and shortens the full /notify/ link", async () => {
        const url = await service.buildUrl({ type: "vwo", id: 5, event: "New WO Raised" });

        expect(url).toBe(`${PUBLIC_APP_URL}/n/abc123XYZ789`);
        expect(shortenMock).toHaveBeenCalledTimes(1);
        expect(shortenMock.mock.calls[0][1]).toMatchObject({ purpose: PUBLIC_NOTIFY_PURPOSE });

        const fullUrl: string = storedFullUrl!;
        expect(fullUrl.startsWith(`${PUBLIC_APP_URL}/notify/`)).toBe(true);
        const token = fullUrl.split("/notify/")[1];
        await expect(service.verify(token)).resolves.toMatchObject({ t: "vwo", id: 5 });
    });

    it("falls back to the full /notify/ URL when shortening fails", async () => {
        shortenMock.mockRejectedValue(new Error("db down"));

        const url = await service.buildUrl({ type: "vwo", id: 5, event: "New WO Raised" });

        expect(url.startsWith(`${PUBLIC_APP_URL}/notify/`)).toBe(true);
        const token = url.split("/notify/")[1];
        await expect(service.verify(token)).resolves.toMatchObject({ t: "vwo", id: 5 });
    });

    it("signs a valid token even when the expiry format is unrecognized", async () => {
        configGet.mockImplementation((key: string) => (key === "app.publicLinkExpiresIn" ? "banana" : PUBLIC_APP_URL));

        const token = await service.sign({ type: "pr", id: 2 });

        await expect(service.verify(token)).resolves.toMatchObject({ t: "pr", id: 2 });
    });

    it("rejects a token signed with a different secret", async () => {
        const forged = await jwtService.signAsync({ t: "pr", id: 1, purpose: PUBLIC_NOTIFY_PURPOSE }, { secret: "some-other-secret", expiresIn: "30d" });

        await expect(service.verify(forged)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a token with the wrong purpose", async () => {
        const wrongPurpose = await jwtService.signAsync({ t: "pr", id: 1, purpose: "password-reset" }, { secret: STATE_SECRET, expiresIn: "30d" });

        await expect(service.verify(wrongPurpose)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a malformed token", async () => {
        await expect(service.verify("not-a-jwt")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an expired token", async () => {
        const expired = await jwtService.signAsync({ t: "pr", id: 1, purpose: PUBLIC_NOTIFY_PURPOSE }, { secret: STATE_SECRET, expiresIn: "1ms" });
        await new Promise(resolve => setTimeout(resolve, 25));

        await expect(service.verify(expired)).rejects.toBeInstanceOf(BadRequestException);
    });
});
