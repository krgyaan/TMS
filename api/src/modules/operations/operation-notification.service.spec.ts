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

describe("OperationNotificationService PO POVWO Group & TL Decision notifications", () => {
    let service: OperationNotificationService;
    let sendText: jest.Mock;
    let toJid: jest.Mock;
    let buildAppShortUrl: jest.Mock;
    let dryRun: boolean;

    beforeEach(async () => {
        sendText = jest.fn().mockResolvedValue({ messageId: "m1" });
        toJid = jest.fn().mockReturnValue("919999999999@c.us");
        buildAppShortUrl = jest.fn().mockImplementation(async (relativePath: string) => {
            return `https://tms.example.com/n/short?to=${encodeURIComponent(relativePath)}`;
        });
        dryRun = false;

        const db = {
            select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue([{ name: "Rahul Sharma", team: 1, mobile: "9999999999" }]),
                    }),
                }),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OperationNotificationService,
                { provide: OpenwaService, useValue: { sendText } },
                { provide: DRIZZLE, useValue: db },
                { provide: WhatsappJidResolver, useValue: { toJid } },
                { provide: PublicLinkService, useValue: { buildUrl: jest.fn(), buildAppShortUrl } },
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

    it("notifyPoCreated routes only to GROUPS.POVWO with shortened PDF approval URL", async () => {
        await service.notifyPoCreated({
            purchaseOrderId: 42,
            poNumber: "PO/2026/0042",
            projectName: "Solar Plant",
            sellerName: "Acme Traders",
            grandTotal: 125000,
            createdBy: 1,
            teamId: 1,
        });

        expect(buildAppShortUrl).toHaveBeenCalledWith("/operations/po/42/approval", "po-tl-approval");
        expect(sendText).toHaveBeenCalledTimes(1);
        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.POVWO);
        expect(text).toContain("PO/2026/0042");
        expect(text).toContain("Solar Plant");
        expect(text).toContain("Acme Traders");
        expect(text).toContain("https://tms.example.com/n/short");
    });

    it("notifyPoTlDecision (Approve) notifies only GROUPS.POVWO", async () => {
        await service.notifyPoTlDecision({
            purchaseOrderId: 42,
            poNumber: "PO/2026/0042",
            projectName: "Solar Plant",
            sellerName: "Acme Traders",
            grandTotal: 125000,
            actedBy: 2,
            createdBy: 1,
            teamId: 2,
            tlStatus: 1,
            tlComment: "Verified rates",
        });

        expect(sendText).toHaveBeenCalledTimes(1);
        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.POVWO);
        expect(text).toContain("PO Approved by TL");
        expect(text).toContain("Verified rates");
        expect(text).toContain("https://tms.example.com/n/short");
    });

    it("notifyPoTlDecision (Reject & Edit Requested) notifies only GROUPS.POVWO with field feedback", async () => {
        await service.notifyPoTlDecision({
            purchaseOrderId: 42,
            poNumber: "PO/2026/0042",
            projectName: "Solar Plant",
            sellerName: "Acme Traders",
            grandTotal: 125000,
            actedBy: 2,
            createdBy: 1,
            teamId: 2,
            tlStatus: 2,
            tlComment: "Price mismatch with quotation",
            rejectionFields: [{ field: "pricing", label: "Unit Rates / Pricing", remark: "Rate is 10% higher than quote" }],
        });

        expect(sendText).toHaveBeenCalledTimes(1);
        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.POVWO);
        expect(text).toContain("PO Rejected by Team Leader");
        expect(text).toContain("Price mismatch with quotation");
        expect(text).toContain("Unit Rates / Pricing: Rate is 10% higher than quote");

        sendText.mockClear();

        await service.notifyPoTlDecision({
            purchaseOrderId: 42,
            poNumber: "PO/2026/0042",
            projectName: "Solar Plant",
            sellerName: "Acme Traders",
            grandTotal: 125000,
            actedBy: 2,
            createdBy: 1,
            teamId: 2,
            tlStatus: 3,
            tlComment: "Update delivery address",
            editFields: [
                {
                    field: "shippingAddress",
                    label: "Delivery Address",
                    oldValue: "Old Warehouse",
                    newValue: "Site Gate 2",
                    remark: "Per client email",
                },
            ],
        });

        expect(sendText).toHaveBeenCalledTimes(1);
        const [groupEdit, textEdit] = sendText.mock.calls[0];
        expect(groupEdit).toBe(GROUPS.POVWO);
        expect(textEdit).toContain("PO Edit Requested by Team Leader");
        expect(textEdit).toContain('Delivery Address: "Old Warehouse" → "Site Gate 2" (Per client email)');
    });

    it("notifyVwoCreated routes only to GROUPS.POVWO with shortened PDF approval URL", async () => {
        await service.notifyVwoCreated({
            vendorWorkOrderId: 99,
            woNumber: "VE/Solar_Plant/2627/WO0099",
            projectName: "Solar Plant",
            sellerName: "Acme Contractors",
            grandTotal: 250000,
            createdBy: 1,
            teamId: 1,
        });

        expect(buildAppShortUrl).toHaveBeenCalledWith("/operations/wo/99/approval", "wo-tl-approval");
        expect(sendText).toHaveBeenCalledTimes(1);
        const [group, text] = sendText.mock.calls[0];
        expect(group).toBe(GROUPS.POVWO);
        expect(text).toContain("VE/Solar_Plant/2627/WO0099");
        expect(text).toContain("Solar Plant");
        expect(text).toContain("Acme Contractors");
        expect(text).toContain("https://tms.example.com/n/short");
    });

    it("notifyVwoTlDecision (Approve, Reject & Edit Requested) notifies only GROUPS.POVWO", async () => {
        await service.notifyVwoTlDecision({
            vendorWorkOrderId: 99,
            woNumber: "VE/Solar_Plant/2627/WO0099",
            projectName: "Solar Plant",
            sellerName: "Acme Contractors",
            grandTotal: 250000,
            actedBy: 2,
            createdBy: 1,
            teamId: 1,
            tlStatus: 1,
            tlComment: "Scope verified",
        });

        expect(sendText).toHaveBeenCalledTimes(1);
        const [group1, text1] = sendText.mock.calls[0];
        expect(group1).toBe(GROUPS.POVWO);
        expect(text1).toContain("WO Approved by TL");
        expect(text1).toContain("Scope verified");
        expect(text1).toContain("https://tms.example.com/n/short");

        sendText.mockClear();

        await service.notifyVwoTlDecision({
            vendorWorkOrderId: 99,
            woNumber: "VE/Solar_Plant/2627/WO0099",
            projectName: "Solar Plant",
            sellerName: "Acme Contractors",
            grandTotal: 250000,
            actedBy: 2,
            createdBy: 1,
            teamId: 1,
            tlStatus: 2,
            tlComment: "Incorrect BOQ items",
        });

        expect(sendText).toHaveBeenCalledTimes(1);
        const [group2, text2] = sendText.mock.calls[0];
        expect(group2).toBe(GROUPS.POVWO);
        expect(text2).toContain("WO Rejected by Team Leader");
        expect(text2).toContain("Incorrect BOQ items");

        sendText.mockClear();

        await service.notifyVwoTlDecision({
            vendorWorkOrderId: 99,
            woNumber: "VE/Solar_Plant/2627/WO0099",
            projectName: "Solar Plant",
            sellerName: "Acme Contractors",
            grandTotal: 250000,
            actedBy: 2,
            createdBy: 1,
            teamId: 1,
            tlStatus: 3,
            tlComment: "Revise GST rate",
            editFields: [{ field: "gst_taxes", label: "GST / Tax Rates", oldValue: "12%", newValue: "18%" }],
        });

        expect(sendText).toHaveBeenCalledTimes(1);
        const [group3, text3] = sendText.mock.calls[0];
        expect(group3).toBe(GROUPS.POVWO);
        expect(text3).toContain("WO Edit Requested by Team Leader");
        expect(text3).toContain('GST / Tax Rates: "12%" → "18%"');
    });

    it("notifyPoApproved and notifyPoRejected send to both GROUPS.POVWO and GROUPS.PAYMENTS with short link", async () => {
        await service.notifyPoApproved({
            purchaseOrderId: 42,
            poNumber: "PO/2026/0042",
            sellerName: "Acme Traders",
            grandTotal: "125000.00",
            tdsPercentage: "2",
            amountAfterTds: "122500.00",
            approvedBy: 33,
        });

        expect(sendText).toHaveBeenCalledTimes(2);
        const approveGroups = sendText.mock.calls.map(([g]) => g);
        expect(approveGroups).toEqual([GROUPS.POVWO, GROUPS.PAYMENTS]);
        expect(sendText.mock.calls[0][1]).toContain("*PO Approved*");
        expect(sendText.mock.calls[0][1]).toContain("https://tms.example.com/n/short");

        sendText.mockClear();

        await service.notifyPoRejected({
            purchaseOrderId: 42,
            poNumber: "PO/2026/0042",
            sellerName: "Acme Traders",
            grandTotal: "125000.00",
            remark: "Incorrect TDS category",
            rejectedBy: 42,
        });

        expect(sendText).toHaveBeenCalledTimes(2);
        const rejectGroups = sendText.mock.calls.map(([g]) => g);
        expect(rejectGroups).toEqual([GROUPS.POVWO, GROUPS.PAYMENTS]);
        expect(sendText.mock.calls[0][1]).toContain("*PO Rejected*");
        expect(sendText.mock.calls[0][1]).toContain("Incorrect TDS category");
    });

    it("notifyVwoApproved and notifyVwoRejected send to both GROUPS.POVWO and GROUPS.PAYMENTS with short link", async () => {
        await service.notifyVwoApproved({
            vendorWorkOrderId: 99,
            woNumber: "VE/Solar_Plant/2627/WO0099",
            sellerName: "Acme Contractors",
            grandTotal: "250000.00",
            tdsPercentage: "1",
            amountAfterTds: "247500.00",
            approvedBy: 62,
        });

        expect(sendText).toHaveBeenCalledTimes(2);
        const approveGroups = sendText.mock.calls.map(([g]) => g);
        expect(approveGroups).toEqual([GROUPS.POVWO, GROUPS.PAYMENTS]);
        expect(sendText.mock.calls[0][1]).toContain("*WO Approved*");
        expect(sendText.mock.calls[0][1]).toContain("https://tms.example.com/n/short");

        sendText.mockClear();

        await service.notifyVwoRejected({
            vendorWorkOrderId: 99,
            woNumber: "VE/Solar_Plant/2627/WO0099",
            sellerName: "Acme Contractors",
            grandTotal: "250000.00",
            remark: "Missing GSTIN",
            rejectedBy: 62,
        });

        expect(sendText).toHaveBeenCalledTimes(2);
        const rejectGroups = sendText.mock.calls.map(([g]) => g);
        expect(rejectGroups).toEqual([GROUPS.POVWO, GROUPS.PAYMENTS]);
        expect(sendText.mock.calls[0][1]).toContain("*WO Rejected*");
        expect(sendText.mock.calls[0][1]).toContain("Missing GSTIN");
    });
});
