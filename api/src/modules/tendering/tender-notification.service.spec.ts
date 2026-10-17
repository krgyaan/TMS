import { Test, TestingModule } from "@nestjs/testing";
import { GROUPS } from "../../config/groups";
import { openwaConfig } from "../../config/openwa.config";
import { OpenwaService } from "../../openwa/openwa.service";
import { WhatsappJidResolver } from "../notifications/helpers/whatsapp-jid.resolver";
import { TenderAllocatedData, TenderNotificationService } from "./tender-notification.service";

describe("TenderNotificationService.notifyTenderAllocated", () => {
    let service: TenderNotificationService;
    let sendText: jest.Mock;
    let toJid: jest.Mock;
    let dryRun: boolean;

    const baseData: TenderAllocatedData = {
        teamId: 1,
        teamMemberId: 42,
        teName: "Jane Doe",
        tenderName: "Supply of Widgets",
        tenderNo: "TND/2026/001",
        dueDate: "12-10-2026 12:23",
        tenderValue: "₹1,00,000",
    };

    beforeEach(async () => {
        sendText = jest.fn().mockResolvedValue({ messageId: "m1" });
        toJid = jest.fn().mockResolvedValue("919876543210@c.us");
        dryRun = false;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenderNotificationService,
                { provide: OpenwaService, useValue: { sendText } },
                { provide: WhatsappJidResolver, useValue: { toJid } },
                {
                    provide: openwaConfig.KEY,
                    useFactory: () => ({
                        get OPENWA_DRY_RUN() {
                            return dryRun;
                        },
                    }),
                },
            ],
        }).compile();

        service = module.get(TenderNotificationService);
    });

    it("sends to the ACTENDERSEARCH group for team 1 with a mention", async () => {
        await service.notifyTenderAllocated(baseData);

        expect(sendText).toHaveBeenCalledTimes(2);
        const [group, text, mentions] = sendText.mock.calls[0];
        const [dmGroup, dmText] = sendText.mock.calls[1];
        expect(dmGroup).toBe("919876543210@c.us");
        expect(dmText).toContain("Dear Jane Doe,");
        expect(group).toBe(GROUPS.ACTENDERSEARCH);
        expect(mentions).toEqual(["919876543210@c.us"]);
        expect(text).toContain("Dear @Jane Doe,");
        expect(text).toContain("- Tender Name: Supply of Widgets");
        expect(text).toContain("- Tender No: TND/2026/001");
        expect(text).toContain("- Due on: 12-10-2026 12:23");
        expect(text).toContain("- Tender Value: ₹1,00,000");
    });

    it("sends to the DCTENDERSEARCH group for team 2", async () => {
        await service.notifyTenderAllocated({ ...baseData, teamId: 2 });

        expect(sendText).toHaveBeenCalledTimes(2);
        expect(sendText.mock.calls[0][0]).toBe(GROUPS.DCTENDERSEARCH);
    });

    it("skips silently for teams without a mapped group", async () => {
        await service.notifyTenderAllocated({ ...baseData, teamId: 3 });

        expect(sendText).not.toHaveBeenCalled();
    });

    it("does not send when OPENWA_DRY_RUN is enabled", async () => {
        dryRun = true;

        await service.notifyTenderAllocated(baseData);

        expect(sendText).not.toHaveBeenCalled();
    });

    it("sends without mentions when the member has no mobile number", async () => {
        toJid.mockResolvedValue(null);

        await service.notifyTenderAllocated(baseData);

        expect(sendText).toHaveBeenCalledTimes(1);
        expect(sendText.mock.calls[0][2]).toBeUndefined();
    });

    it("swallows send errors", async () => {
        sendText.mockRejectedValue(new Error("boom"));

        await expect(service.notifyTenderAllocated(baseData)).resolves.toBeUndefined();
    });
});
