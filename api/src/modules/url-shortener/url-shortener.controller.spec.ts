import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UrlShortenerController } from "./url-shortener.controller";
import { UrlShortenerService } from "./url-shortener.service";

describe("UrlShortenerController", () => {
    let controller: UrlShortenerController;

    const resolveOrThrow = jest.fn();

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UrlShortenerController],
            providers: [{ provide: UrlShortenerService, useValue: { resolveOrThrow } }],
        }).compile();

        controller = module.get(UrlShortenerController);
    });

    it("resolves a token to its URL", async () => {
        resolveOrThrow.mockResolvedValue({ url: "https://tms.example.com/notify/abc.jwt" });

        await expect(controller.resolve("abc123XYZ789")).resolves.toEqual({ url: "https://tms.example.com/notify/abc.jwt" });
        expect(resolveOrThrow).toHaveBeenCalledWith("abc123XYZ789");
    });

    it("propagates the not-found error for unknown tokens", async () => {
        resolveOrThrow.mockRejectedValue(new NotFoundException("Link expired or invalid."));

        await expect(controller.resolve("bad")).rejects.toBeInstanceOf(NotFoundException);
    });
});
