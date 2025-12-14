import { Test, TestingModule } from "@nestjs/testing";
import { FollowUpService } from "@/modules/follow-up/follow-up.service";

describe("FollowUpService", () => {
    let service: FollowUpService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FollowUpService],
        }).compile();

        service = module.get<FollowUpService>(FollowUpService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
