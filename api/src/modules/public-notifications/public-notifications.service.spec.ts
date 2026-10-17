import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE } from "@/db/database.module";
import { PublicLinkService, type PublicNotifyClaims } from "./public-link.service";
import { ENTITY_RESOLVERS } from "./entity-resolvers";
import { PublicNotificationsService } from "./public-notifications.service";

describe("PublicNotificationsService", () => {
    let service: PublicNotificationsService;

    const mockDb = {};
    const mockPublicLink = { verify: jest.fn() };
    const mockResolvers = {
        pr: jest.fn(),
        po: jest.fn(),
        vwo: jest.fn(),
    };

    beforeEach(async () => {
        jest.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PublicNotificationsService,
                { provide: DRIZZLE, useValue: mockDb },
                { provide: PublicLinkService, useValue: mockPublicLink },
                { provide: ENTITY_RESOLVERS, useValue: mockResolvers },
            ],
        }).compile();

        service = module.get(PublicNotificationsService);
    });

    it("returns type, event and entity for a valid token", async () => {
        const claims: PublicNotifyClaims = { t: "pr", id: 9, ev: "New Payment Request", purpose: "wa-notify" };
        const entity = { id: 9, referenceNo: "PR/001" };
        mockPublicLink.verify.mockResolvedValue(claims);
        mockResolvers.pr.mockResolvedValue(entity);

        const result = await service.getByToken("some-token");

        expect(result).toEqual({ type: "pr", event: "New Payment Request", entity });
        expect(mockResolvers.pr).toHaveBeenCalledWith(mockDb, 9);
    });

    it("returns a null event when the token carries none", async () => {
        mockPublicLink.verify.mockResolvedValue({ t: "po", id: 3, purpose: "wa-notify" });
        mockResolvers.po.mockResolvedValue({ id: 3 });

        const result = await service.getByToken("some-token");

        expect(result.event).toBeNull();
        expect(result.type).toBe("po");
    });

    it("throws NotFound for an unsupported entity type", async () => {
        mockPublicLink.verify.mockResolvedValue({ t: "zzz" as never, id: 1, purpose: "wa-notify" });

        await expect(service.getByToken("some-token")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFound when the entity no longer exists", async () => {
        mockPublicLink.verify.mockResolvedValue({ t: "vwo", id: 4, purpose: "wa-notify" });
        mockResolvers.vwo.mockResolvedValue(null);

        await expect(service.getByToken("some-token")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("propagates invalid/expired token errors from the link service", async () => {
        mockPublicLink.verify.mockRejectedValue(new BadRequestException("expired"));

        await expect(service.getByToken("bad-token")).rejects.toBeInstanceOf(BadRequestException);
    });
});
