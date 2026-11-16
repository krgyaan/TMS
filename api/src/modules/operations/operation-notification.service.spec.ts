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

describe("OperationNotificationService payment request notifications", () => {
    let service: OperationNotificationService;
    let sendText: jest.Mock;
    let dryRun: boolean;

    const paymentRequestData = {
        requestNo: "MR/2026/0001",
        amount: 5000,
        partyName: "Acme Traders",
        portalLink: null,
        requestedBy: 1,
        category: "dd",
    };

    beforeEach(async () => {
        sendText = jest.fn().mockResolvedValue({ messageId: "m1" });
        dryRun = false;

        const db = {
            select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue([{ name: "Rahul Sharma" }]),
                    }),
                }),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OperationNotificationService,
                { provide: OpenwaService, useValue: { sendText } },
                { provide: DRIZZLE, useValue: db },
                { provide: WhatsappJidResolver, useValue: { toJid: jest.fn() } },
                { provide: PublicLinkService, useValue: { buildUrl: jest.fn() } },
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

    it("sends newly routed categories to the PAYMENTS group", async () => {
        await service.notifyNewPaymentRequest(paymentRequestData);

        expect(sendText).toHaveBeenCalledTimes(1);
        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.PAYMENTS);
        expect(text).toContain("Category: Demand Draft");
    });

    it.each([
        ["registration_charges", "Registration Charges"],
        ["pop_charges", "POP Charges"],
        ["bank_charges", "Bank Charges"],
        ["diwali_gift_expenses", "Diwali/Gift Expenses"],
        ["inventory_purchase", "Inventory Purchase"],
        ["bt", "Bank Transfer"],
        ["pop", "Pay On Portal"],
        ["bg", "Bank Guarantee"],
        ["sb", "Surity Bond"],
        ["fdr", "Fixed Deposit Receipt"],
        ["sd_vendor", "Security Deposit - Vendor"],
        ["sd_landlord", "Security Deposit - Landlord"],
    ])("routes %s to PAYMENTS with label %s", async (category, label) => {
        await service.notifyNewPaymentRequest({ ...paymentRequestData, category });

        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.PAYMENTS);
        expect(text).toContain(`Category: ${label}`);
    });

    it("includes the category label on maker done, payment done and rejection messages", async () => {
        await service.notifyMakerDone({ ...paymentRequestData, category: "po" });
        await service.notifyPaymentDone({ ...paymentRequestData, category: "po", utrNumber: "UTR123" });
        await service.notifyRejection({ ...paymentRequestData, category: "po", rejectionReason: "Invalid invoice" });

        const texts = sendText.mock.calls.map(([, text]) => text as string);
        expect(texts).toHaveLength(3);
        texts.forEach(text => expect(text).toContain("Category: PO"));
    });

    it("falls back to a prettified label for unknown categories", async () => {
        await service.notifyNewPaymentRequest({ ...paymentRequestData, category: "some_new_category" });

        const [, text] = sendText.mock.calls[0];
        expect(text).toContain("Category: Some New Category");
    });
});

describe("OperationNotificationService PO approval notifications", () => {
    let service: OperationNotificationService;
    let sendText: jest.Mock;
    let buildUrl: jest.Mock;
    let toJid: jest.Mock;
    let dryRun: boolean;

    beforeEach(async () => {
        sendText = jest.fn().mockResolvedValue({ messageId: "msg-po-123" });
        buildUrl = jest.fn().mockResolvedValue("https://tms.example.com/n/po42");
        toJid = jest.fn().mockResolvedValue("919999900001@c.us");
        dryRun = false;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OperationNotificationService,
                { provide: OpenwaService, useValue: { sendText } },
                { provide: DRIZZLE, useValue: {} },
                { provide: WhatsappJidResolver, useValue: { toJid } },
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

    it("dispatches Stage 1 (TL) 1:1 DM and Team Group broadcast with preview URL", async () => {
        const res = await service.sendPoApprovalStageMessages({
            purchaseOrderId: 42,
            poNumber: "PO0042",
            stageOrder: 1,
            stageRole: "tl",
            approverName: "Rajesh TL",
            approverJid: "919876543210@c.us",
            tenderNo: "TND-2026-01",
            tenderName: "Solar Inverter Supply",
            organizationName: "DMRC",
            projectName: "Metro Line 3",
            sellerName: "SolarMax Pvt Ltd",
            itemsSummary: "Inverter 50kW (2 Nos)",
            grandTotal: 250000,
            createdByName: "Yuvraj Sharma",
            teamId: 1,
        });

        expect(res).toEqual({
            dmMessageId: "msg-po-123",
            dmChatId: "919876543210@c.us",
        });
        expect(buildUrl).toHaveBeenCalledWith({
            type: "po",
            id: 42,
            event: "PO Approval",
        });
        expect(sendText).toHaveBeenCalledTimes(2);

        const [dmTarget, dmBody] = sendText.mock.calls[0];
        expect(dmTarget).toBe("919876543210@c.us");
        expect(dmBody).toContain("*PO Approval Required — Stage 1: Team Leader Approval*");
        expect(dmBody).toContain("PO No: PO0042");
        expect(dmBody).toContain("Tender: TND-2026-01 - Solar Inverter Supply");
        expect(dmBody).toContain("Organization: DMRC");
        expect(dmBody).toContain("Preview in TMS: https://tms.example.com/n/po42");
        expect(dmBody).toContain("Reply *APPROVE* (or *1*) to approve");

        const [groupTarget, groupBody] = sendText.mock.calls[1];
        expect(groupTarget).toBe(GROUPS.ACTENDERSEARCH);
        expect(groupBody).toContain("Assigned to: Rajesh TL (Team Leader)");
    });

    it("dispatches Stage 2 (Accounts) 1:1 DM with 1-11 TDS menu and ACCOUNTS_TEAM broadcast", async () => {
        await service.sendPoApprovalStageMessages({
            purchaseOrderId: 42,
            poNumber: "PO0042",
            stageOrder: 2,
            stageRole: "accounts",
            approverName: "Neha Accounts",
            approverJid: "919811112222@c.us",
            tenderNo: "TND-2026-01",
            tenderName: "Solar Inverter Supply",
            organizationName: "DMRC",
            projectName: "Metro Line 3",
            sellerName: "SolarMax Pvt Ltd",
            itemsSummary: "Inverter 50kW (2 Nos)",
            grandTotal: 250000,
            createdByName: "Yuvraj Sharma",
            teamId: 1,
        });

        expect(sendText).toHaveBeenCalledTimes(2);
        const [dmTarget, dmBody] = sendText.mock.calls[0];
        expect(dmTarget).toBe("919811112222@c.us");
        expect(dmBody).toContain("*PO Approval Required — Stage 2: Accounts Approval*");
        expect(dmBody).toContain("1. No TDS (0%)");
        expect(dmBody).toContain("11. 194Q @0.1% - Purchase of Goods");
        expect(dmBody).toContain("Reply *APPROVE <1-11>*");

        const [groupTarget, groupBody] = sendText.mock.calls[1];
        expect(groupTarget).toBe(GROUPS.ACCOUNTS_TEAM);
        expect(groupBody).toContain("Assigned to: Neha Accounts (Accounts Manager)");
    });

    it("broadcasts final approval confirmation to PAYMENTS, ACCOUNTS_TEAM, Team Group, approver, and creator", async () => {
        await service.sendPoApprovalStageResult({
            purchaseOrderId: 42,
            poNumber: "PO0042",
            stageOrder: 2,
            stageRole: "accounts",
            decision: "approved",
            actorName: "Neha Accounts",
            sellerName: "SolarMax Pvt Ltd",
            grandTotal: 250000,
            tdsSection: "194C",
            tdsPercentage: "2",
            amountAfterTds: "245762.71",
            teamId: 1,
            creatorUserId: 99,
            replyToChatId: "919811112222@c.us",
            isFinalApproval: true,
        });

        const calledTargets = sendText.mock.calls.map(([target]) => target);
        expect(calledTargets).toEqual(
            expect.arrayContaining([
                GROUPS.PAYMENTS,
                GROUPS.ACCOUNTS_TEAM,
                GROUPS.ACTENDERSEARCH,
                "919811112222@c.us",
                "919999900001@c.us",
            ]),
        );
        const [, msg] = sendText.mock.calls[0];
        expect(msg).toContain("*PO Approved (Accounts)*");
        expect(msg).toContain("TDS: 194C @2%");
        expect(msg).toContain("Status: Final PO Approval Complete");
    });
});

