import { Test, TestingModule } from "@nestjs/testing";
import { FollowUpController } from "./follow-up.controller";

describe("FollowUpController", () => {
    let controller: FollowUpController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [FollowUpController],
        }).compile();

        controller = module.get<FollowUpController>(FollowUpController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
