import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE } from "../../db/database.module";
import { GROUPS } from "../../config/groups";
import { openwaConfig } from "../../config/openwa.config";
import { OpenwaService } from "../../openwa/openwa.service";
import { WhatsappJidResolver } from "../notifications/helpers/whatsapp-jid.resolver";
import { PublicLinkService } from "../public-notifications/public-link.service";
import { OperationNotificationService, WoBasicDetailsCreatedData, WoBasicDetailsRevisedData } from "./operation-notification.service";

describe("OperationNotificationService.notifyWoBasicDetailsCreated", () => {
    let service: OperationNotificationService;
    let sendText: jest.Mock;
    let buildUrl: jest.Mock;
    let dryRun: boolean;

    const baseData: WoBasicDetailsCreatedData = {
        woBasicDetailId: 7,
        organizationName: "Volks Energie",
        projectName: "Solar Plant",
        projectCode: "PRJ-001",
        woValuePreGst: "1500000",
    };

    beforeEach(async () => {
        sendText = jest.fn().mockResolvedValue({ messageId: "m1" });
        buildUrl = jest.fn().mockResolvedValue("https://example.com/n/abc123");
        dryRun = false;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OperationNotificationService,
                { provide: OpenwaService, useValue: { sendText } },
                { provide: DRIZZLE, useValue: {} },
                { provide: WhatsappJidResolver, useValue: { toJid: jest.fn() } },
                { provide: PublicLinkService, useValue: { buildUrl } },
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

        service = module.get(OperationNotificationService);
    });

    it("sends the WO basic details message to the WORKORDER group with a short URL", async () => {
        await service.notifyWoBasicDetailsCreated(baseData);

        expect(buildUrl).toHaveBeenCalledWith({ type: "wobd", id: 7, event: "New Work Order (PO)" });
        expect(sendText).toHaveBeenCalledTimes(1);
        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.WORKORDER);
        expect(text).toContain("Congrats!! We got new  Work Order (PO) From Volks Energie.");
        expect(text).toContain("- Project Name: Solar Plant");
        expect(text).toContain("- Project Code: PRJ-001");
        expect(text).toContain("- Value (preGST): ₹15,00,000");
        expect(text).toContain("click here to view full details. https://example.com/n/abc123");
    });

    it("includes creator and team member names when provided", async () => {
        await service.notifyWoBasicDetailsCreated({
            ...baseData,
            actorName: "Rahul Sharma",
            teamMemberName: "Anurag",
        });

        const [, text] = sendText.mock.calls[0];
        expect(text).toContain("- Created by: Rahul Sharma");
        expect(text).toContain("- Team Member: Anurag");
    });

    it("omits creator and team member lines when not provided", async () => {
        await service.notifyWoBasicDetailsCreated(baseData);

        const [, text] = sendText.mock.calls[0];
        expect(text).not.toContain("Created by");
        expect(text).not.toContain("Team Member");
    });

    it("still sends when public link building fails", async () => {
        buildUrl.mockRejectedValue(new Error("missing stateSecret"));

        await service.notifyWoBasicDetailsCreated(baseData);

        expect(sendText).toHaveBeenCalledTimes(1);
        const [, text] = sendText.mock.calls[0];
        expect(text).toContain("- Project Code: PRJ-001");
        expect(text).not.toContain("click here to view full details");
    });

    it("falls back to N/A for missing fields", async () => {
        await service.notifyWoBasicDetailsCreated({
            woBasicDetailId: 8,
            organizationName: null,
            projectName: null,
            projectCode: null,
            woValuePreGst: null,
        });

        const [, text] = sendText.mock.calls[0];
        expect(text).toContain("From N/A.");
        expect(text).toContain("- Project Name: N/A");
        expect(text).toContain("- Project Code: N/A");
        expect(text).toContain("- Value (preGST): N/A");
    });

    it("does not send when OPENWA_DRY_RUN is enabled", async () => {
        dryRun = true;

        await service.notifyWoBasicDetailsCreated(baseData);

        expect(sendText).not.toHaveBeenCalled();
    });
});

describe("OperationNotificationService.notifyWoBasicDetailsUpdated", () => {
    let service: OperationNotificationService;
    let sendText: jest.Mock;
    let buildUrl: jest.Mock;
    let dryRun: boolean;

    const baseData: WoBasicDetailsCreatedData = {
        woBasicDetailId: 7,
        organizationName: "Volks Energie",
        projectName: "Solar Plant",
        projectCode: "PRJ-001",
        woValuePreGst: "1500000",
    };

    beforeEach(async () => {
        sendText = jest.fn().mockResolvedValue({ messageId: "m1" });
        buildUrl = jest.fn().mockResolvedValue("https://example.com/n/abc123");
        dryRun = false;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OperationNotificationService,
                { provide: OpenwaService, useValue: { sendText } },
                { provide: DRIZZLE, useValue: {} },
                { provide: WhatsappJidResolver, useValue: { toJid: jest.fn() } },
                { provide: PublicLinkService, useValue: { buildUrl } },
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

        service = module.get(OperationNotificationService);
    });

    it("sends the update message to the WORKORDER group with a short URL", async () => {
        await service.notifyWoBasicDetailsUpdated({ ...baseData, actorName: "Priya Nair" });

        expect(buildUrl).toHaveBeenCalledWith({ type: "wobd", id: 7, event: "Work Order (PO) Updated" });
        expect(sendText).toHaveBeenCalledTimes(1);
        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.WORKORDER);
        expect(text).toContain("Work Order (PO) has been updated from Volks Energie.");
        expect(text).toContain("- Project Name: Solar Plant");
        expect(text).toContain("- Project Code: PRJ-001");
        expect(text).toContain("- Value (preGST): ₹15,00,000");
        expect(text).toContain("- Updated by: Priya Nair");
        expect(text).toContain("click here to view full details. https://example.com/n/abc123");
    });

    it("still sends when public link building fails", async () => {
        buildUrl.mockRejectedValue(new Error("missing stateSecret"));

        await service.notifyWoBasicDetailsUpdated(baseData);

        expect(sendText).toHaveBeenCalledTimes(1);
        const [, text] = sendText.mock.calls[0];
        expect(text).toContain("- Project Code: PRJ-001");
        expect(text).not.toContain("click here to view full details");
    });

    it("does not send when OPENWA_DRY_RUN is enabled", async () => {
        dryRun = true;

        await service.notifyWoBasicDetailsUpdated(baseData);

        expect(sendText).not.toHaveBeenCalled();
    });
});

describe("OperationNotificationService.notifyWoBasicDetailsRevised", () => {
    let service: OperationNotificationService;
    let sendText: jest.Mock;
    let buildUrl: jest.Mock;
    let dryRun: boolean;

    const baseData: WoBasicDetailsRevisedData = {
        woBasicDetailId: 7,
        organizationName: "Volks Energie",
        projectName: "Solar Plant",
        projectCode: "PRJ-001",
        woValuePreGst: "1800000",
        revisionNumber: 2,
        revisionNotes: "Revised PO value",
    };

    beforeEach(async () => {
        sendText = jest.fn().mockResolvedValue({ messageId: "m1" });
        buildUrl = jest.fn().mockResolvedValue("https://example.com/n/abc123");
        dryRun = false;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OperationNotificationService,
                { provide: OpenwaService, useValue: { sendText } },
                { provide: DRIZZLE, useValue: {} },
                { provide: WhatsappJidResolver, useValue: { toJid: jest.fn() } },
                { provide: PublicLinkService, useValue: { buildUrl } },
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

        service = module.get(OperationNotificationService);
    });

    it("sends the revise message with revision number and notes", async () => {
        await service.notifyWoBasicDetailsRevised({ ...baseData, actorName: "Amit Verma" });

        expect(buildUrl).toHaveBeenCalledWith({ type: "wobd", id: 7, event: "Work Order (PO) Revised" });
        expect(sendText).toHaveBeenCalledTimes(1);
        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.WORKORDER);
        expect(text).toContain("Work Order (PO) has been revised (Rev 2) from Volks Energie.");
        expect(text).toContain("- Project Name: Solar Plant");
        expect(text).toContain("- Value (preGST): ₹18,00,000");
        expect(text).toContain("- Revised by: Amit Verma");
        expect(text).toContain("- Revision: 2");
        expect(text).toContain("- Notes: Revised PO value");
        expect(text).toContain("click here to view full details. https://example.com/n/abc123");
    });

    it("falls back to N/A for missing notes", async () => {
        await service.notifyWoBasicDetailsRevised({ ...baseData, revisionNotes: null });

        const [, text] = sendText.mock.calls[0];
        expect(text).toContain("- Notes: N/A");
    });

    it("does not send when OPENWA_DRY_RUN is enabled", async () => {
        dryRun = true;

        await service.notifyWoBasicDetailsRevised(baseData);

        expect(sendText).not.toHaveBeenCalled();
    });
});
