import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE } from "@/db/database.module";
import { openwaConfig } from "@/config/openwa.config";
import { OpenwaService } from "@/openwa/openwa.service";
import { WhatsappJidResolver } from "@/modules/notifications/helpers/whatsapp-jid.resolver";
import { OperationNotificationService } from "@/modules/operations/operation-notification.service";
import { CashFlowService } from "@/modules/operations/cash-flows/cash-flow.service";
import { PoApprovalService } from "./po-approval.service";
import type { PoApprovalStep } from "@/db/schemas";

jest.mock("@/modules/operations/inventory/inventory.materialize", () => ({
    poHasPurchaseInvoice: jest.fn().mockResolvedValue(false),
    tryMaterializePoInventory: jest.fn().mockResolvedValue(undefined),
}));

function createQueryChain(resolvedValue: unknown = []) {
    const chain: Record<string, jest.Mock> = {};
    const methods = [
        "select",
        "from",
        "leftJoin",
        "innerJoin",
        "where",
        "orderBy",
        "limit",
        "insert",
        "values",
        "update",
        "set",
        "returning",
    ];
    for (const m of methods) {
        chain[m] = jest.fn().mockReturnValue(chain);
    }
    // Make chain thenable so `await db.select()...` resolves to `resolvedValue`
    (chain as unknown as PromiseLike<unknown>).then = <TResult1 = unknown, TResult2 = never>(
        onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) => Promise.resolve(resolvedValue).then(onfulfilled, onrejected);

    return chain;
}

describe("PoApprovalService", () => {
    let service: PoApprovalService;
    let dbMock: {
        select: jest.Mock;
        insert: jest.Mock;
        update: jest.Mock;
        transaction: jest.Mock;
    };
    let notificationsMock: {
        sendPoApprovalStageMessages: jest.Mock;
        sendPoApprovalStageResult: jest.Mock;
        notifyNewPaymentRequest: jest.Mock;
    };
    let jidResolverMock: {
        toJid: jest.Mock;
        normalizeToJid: jest.Mock;
    };
    let openwaMock: {
        sendText: jest.Mock;
    };
    let cashFlowMock: {
        create: jest.Mock;
    };

    beforeEach(async () => {
        dbMock = {
            select: jest.fn(() => createQueryChain([])),
            insert: jest.fn(() => createQueryChain([{ id: 1 }])),
            update: jest.fn(() => createQueryChain([{ id: 1 }])),
            transaction: jest.fn(async cb => cb(dbMock)),
        };

        notificationsMock = {
            sendPoApprovalStageMessages: jest.fn().mockResolvedValue({
                dmMessageId: "wa-msg-stage-1",
                dmChatId: "919876543210@c.us",
            }),
            sendPoApprovalStageResult: jest.fn().mockResolvedValue(undefined),
            notifyNewPaymentRequest: jest.fn().mockResolvedValue(undefined),
        };

        jidResolverMock = {
            toJid: jest.fn().mockResolvedValue("919876543210@c.us"),
            normalizeToJid: jest.fn((m: string) => `${m.replace(/\D/g, "")}@c.us`),
        };

        openwaMock = {
            sendText: jest.fn().mockResolvedValue({ messageId: "reply-1" }),
        };

        cashFlowMock = {
            create: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PoApprovalService,
                { provide: DRIZZLE, useValue: dbMock },
                { provide: OperationNotificationService, useValue: notificationsMock },
                { provide: WhatsappJidResolver, useValue: jidResolverMock },
                { provide: OpenwaService, useValue: openwaMock },
                { provide: CashFlowService, useValue: cashFlowMock },
                {
                    provide: openwaConfig.KEY,
                    useValue: {
                        OPENWA_BASE_URL: "http://localhost:3000",
                        OPENWA_API_KEY: "test-key",
                        OPENWA_SESSION_ID: "default",
                        OPENWA_DRY_RUN: false,
                    },
                },
            ],
        }).compile();

        service = module.get(PoApprovalService);
    });

    describe("Command & Phone Parsing", () => {
        it("normalizes phone numbers and JIDs to last 10 digits", () => {
            expect(service.normalizePhoneLast10("919876543210@c.us")).toBe("9876543210");
            expect(service.normalizePhoneLast10("+91 98765-43210")).toBe("9876543210");
            expect(service.normalizePhoneLast10("919876543210:14@s.whatsapp.net")).toBe("9876543210");
            expect(service.normalizePhoneLast10("12345")).toBeNull();
        });

        it("parses Stage 1 commands (APPROVE, 1, REJECT <reason>, 2 <reason>)", () => {
            expect(service.parseStage1Command("APPROVE")).toEqual({
                type: "approved",
                remark: null,
                poToken: null,
            });
            expect(service.parseStage1Command("1 Looks good")).toEqual({
                type: "approved",
                remark: "Looks good",
                poToken: null,
            });
            expect(service.parseStage1Command("APPROVE PO0042 Urgent")).toEqual({
                type: "approved",
                remark: "Urgent",
                poToken: "PO0042",
            });
            expect(service.parseStage1Command("REJECT Vendor rate mismatch")).toEqual({
                type: "rejected",
                remark: "Vendor rate mismatch",
                poToken: null,
            });
            expect(service.parseStage1Command("2 Duplicate PO")).toEqual({
                type: "rejected",
                remark: "Duplicate PO",
                poToken: null,
            });
            expect(service.parseStage1Command("Hello world")).toBeNull();
        });

        it("parses Stage 2 commands with strict 1..11 TDS menu requirement", () => {
            // Bare APPROVE without option index -> missing_tds_option (never silently defaults to 0%)
            expect(service.parseStage2Command("APPROVE", true)).toEqual({
                type: "missing_tds_option",
                poToken: null,
            });

            // Explicit Option 1 -> No TDS (0%)
            const opt1 = service.parseStage2Command("APPROVE 1", true);
            expect(opt1).toEqual({
                type: "approved",
                tdsOption: expect.objectContaining({ index: 1, percentage: "0", section: null }),
                remark: null,
                poToken: null,
            });

            // Explicit Option 3 -> 194C @2%
            const opt3 = service.parseStage2Command("APPROVE 3 Cleared", false);
            expect(opt3).toEqual({
                type: "approved",
                tdsOption: expect.objectContaining({ index: 3, percentage: "2", section: "194C" }),
                remark: "Cleared",
                poToken: null,
            });

            // Bare number when quoting the Stage 2 prompt
            const bareQuoted = service.parseStage2Command("5", true);
            expect(bareQuoted).toEqual({
                type: "approved",
                tdsOption: expect.objectContaining({ index: 5, percentage: "10", section: "194J" }),
                remark: null,
                poToken: null,
            });

            // Out-of-range TDS option -> missing_tds_option
            expect(service.parseStage2Command("APPROVE 19", true)).toEqual({
                type: "missing_tds_option",
                poToken: null,
            });

            // Reject in Stage 2
            expect(service.parseStage2Command("REJECT GSTIN invalid", true)).toEqual({
                type: "rejected",
                remark: "GSTIN invalid",
                poToken: null,
            });
        });
    });

    describe("Approver Resolution", () => {
        it("resolves Stage 1 TL from hrms_employee_profiles.reporting_tl when present", async () => {
            dbMock.select
                .mockReturnValueOnce(createQueryChain([{ reportingTl: 15 }]))
                .mockReturnValueOnce(
                    createQueryChain([{ id: 15, name: "Vikram TL", mobile: "9876543210" }])
                );
            jidResolverMock.toJid.mockResolvedValueOnce("919876543210@c.us");

            const res = await service.resolveStage1Tl(101, 1);
            expect(res).toEqual({
                userId: 15,
                name: "Vikram TL",
                mobile: "9876543210",
                jid: "919876543210@c.us",
            });
        });

        it("falls back to team Team Leader when reporting_tl is not set", async () => {
            dbMock.select
                .mockReturnValueOnce(createQueryChain([{ reportingTl: null }]))
                .mockReturnValueOnce(createQueryChain([{ primaryTeamId: 2, team: 2 }]))
                .mockReturnValueOnce(
                    createQueryChain([{ id: 22, name: "Team 2 TL", mobile: "9811122233" }])
                );
            jidResolverMock.toJid.mockResolvedValueOnce("919811122233@c.us");

            const res = await service.resolveStage1Tl(101, 2);
            expect(res).toEqual({
                userId: 22,
                name: "Team 2 TL",
                mobile: "9811122233",
                jid: "919811122233@c.us",
            });
        });
    });

    describe("Incoming Webhook Reply Handling", () => {
        const activeStage1Step: PoApprovalStep = {
            id: 10,
            workflowId: 5,
            purchaseOrderId: 42,
            stageOrder: 1,
            stageRole: "tl",
            approverUserId: 15,
            approverNameSnapshot: "Vikram TL",
            approverMobileSnapshot: "9876543210",
            approverJid: "919876543210@c.us",
            approverLid: null,
            waMessageId: "wa-msg-stage-1",
            waChatId: "919876543210@c.us",
            status: "active",
            skipReason: null,
            tdsSection: null,
            tdsPercentage: null,
            decisionRemark: null,
            replyMessageId: null,
            sentAt: new Date(),
            actedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const activeStage2Step: PoApprovalStep = {
            ...activeStage1Step,
            id: 11,
            stageOrder: 2,
            stageRole: "accounts",
            approverUserId: 30,
            approverNameSnapshot: "Neha Accounts",
            approverMobileSnapshot: "9811112222",
            approverJid: "919811112222@c.us",
            approverLid: "8844221100@lid",
            waMessageId: "wa-msg-stage-2",
            waChatId: "919811112222@c.us",
        };

        it("handles Stage 1 APPROVE reply, updates purchase_orders.tl_status = true, and triggers Stage 2", async () => {
            dbMock.select.mockReturnValueOnce(createQueryChain([activeStage1Step]));
            dbMock.update.mockReturnValueOnce(
                createQueryChain([{ ...activeStage1Step, status: "approved" }])
            );
            jest.spyOn(service, "activateStage2").mockResolvedValueOnce(undefined);

            const res = await service.handleIncomingWhatsappMessage({
                messageId: "in-msg-1",
                chatId: "919876543210@c.us",
                sender: "919876543210@c.us",
                body: "APPROVE Verified specs",
                quotedMessageId: "wa-msg-stage-1",
            });

            expect(res).toEqual({
                handled: true,
                action: "stage1_approved",
                purchaseOrderId: 42,
            });
            expect(service.activateStage2).toHaveBeenCalledWith(5, 42, undefined);
        });

        it("handles Stage 1 REJECT reply, sets tl_status = false and po_approved = false", async () => {
            dbMock.select.mockReturnValueOnce(createQueryChain([activeStage1Step]));
            dbMock.update.mockReturnValueOnce(
                createQueryChain([{ ...activeStage1Step, status: "rejected" }])
            );

            const res = await service.handleIncomingWhatsappMessage({
                messageId: "in-msg-2",
                chatId: "919876543210@c.us",
                sender: "919876543210@c.us",
                body: "REJECT Wrong vendor selected",
                quotedMessageId: "wa-msg-stage-1",
            });

            expect(res).toEqual({
                handled: true,
                action: "stage1_rejected",
                purchaseOrderId: 42,
            });
        });

        it("prompts Accounts for TDS option when bare APPROVE is sent in Stage 2 without consuming step", async () => {
            dbMock.select
                .mockReturnValueOnce(createQueryChain([activeStage2Step]))
                .mockReturnValueOnce(createQueryChain([{ poNumber: "PO0042" }]));

            const res = await service.handleIncomingWhatsappMessage({
                messageId: "in-msg-3",
                chatId: "8844221100@lid",
                sender: "8844221100@lid",
                body: "APPROVE",
                quotedMessageId: "wa-msg-stage-2",
            });

            expect(res).toEqual({
                handled: true,
                action: "prompted_tds_option",
                reason: "missing_or_invalid_tds_option",
                purchaseOrderId: 42,
            });
            expect(openwaMock.sendText).toHaveBeenCalledWith(
                "8844221100@lid",
                expect.stringContaining("Please specify a TDS option number (1-11)")
            );
        });

        it("resolves @lid sender and completes Stage 2 approval with TDS calculation on APPROVE 3", async () => {
            // 1. activeSteps
            // 2. purchaseOrders select
            // 3. purchaseOrderProducts select
            // 4. orderExtraCharges select
            // 5. pendingPrs select
            // 6. loadPoNotificationContext select
            dbMock.select
                .mockReturnValueOnce(createQueryChain([activeStage2Step]))
                .mockReturnValueOnce(
                    createQueryChain([
                        {
                            id: 42,
                            poNumber: "PO0042",
                            projectId: null,
                            poRaisedBy: 101,
                            team: 1,
                            sellerName: "SolarMax Pvt Ltd",
                        },
                    ])
                )
                .mockReturnValueOnce(
                    createQueryChain([{ qty: "10", rate: "1000", gstRate: "18" }])
                )
                .mockReturnValueOnce(createQueryChain([]))
                .mockReturnValueOnce(createQueryChain([]))
                .mockReturnValueOnce(createQueryChain([]));

            dbMock.update.mockReturnValueOnce(
                createQueryChain([{ ...activeStage2Step, status: "approved" }])
            );

            const res = await service.handleIncomingWhatsappMessage({
                messageId: "in-msg-4",
                chatId: "8844221100@lid",
                sender: "8844221100@lid",
                body: "APPROVE 3",
                quotedMessageId: "wa-msg-stage-2",
            });

            expect(res).toEqual({
                handled: true,
                action: "stage2_approved",
                purchaseOrderId: 42,
            });
            expect(notificationsMock.sendPoApprovalStageResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    purchaseOrderId: 42,
                    stageRole: "accounts",
                    decision: "approved",
                    tdsSection: "194C",
                    tdsPercentage: "2",
                    // subtotal = 10,000, GST = 1,800 -> grandTotal = 11,800; TDS 2% of 10,000 = 200 -> amountAfterTds = 11,600
                    amountAfterTds: "11600.00",
                    isFinalApproval: true,
                })
            );
        });

        it("ignores unauthorized sender quoting an active step", async () => {
            dbMock.select.mockReturnValueOnce(createQueryChain([activeStage1Step]));

            const res = await service.handleIncomingWhatsappMessage({
                messageId: "in-msg-5",
                chatId: "919000000000@c.us",
                sender: "919000000000@c.us",
                body: "APPROVE",
                quotedMessageId: "wa-msg-stage-1",
            });

            expect(res).toEqual({
                handled: false,
                reason: "unauthorized_sender",
                purchaseOrderId: 42,
            });
        });

        it("ignores duplicate reply on an already-processed step", async () => {
            dbMock.select
                .mockReturnValueOnce(createQueryChain([])) // no active steps
                .mockReturnValueOnce(
                    createQueryChain([{ ...activeStage1Step, status: "approved" }])
                );

            const res = await service.handleIncomingWhatsappMessage({
                messageId: "in-msg-6",
                chatId: "919876543210@c.us",
                sender: "919876543210@c.us",
                body: "APPROVE",
                quotedMessageId: "wa-msg-stage-1",
            });

            expect(res).toEqual({
                handled: false,
                reason: "step_already_processed",
                purchaseOrderId: 42,
            });
        });

        it("supports native OpenWA v0.5.0 payload fields (id, from, senderPhone, quotedMessage.id)", async () => {
            dbMock.select.mockReturnValueOnce(createQueryChain([activeStage1Step]));
            dbMock.update.mockReturnValueOnce(
                createQueryChain([{ ...activeStage1Step, status: "approved" }])
            );
            jest.spyOn(service, "activateStage2").mockResolvedValueOnce(undefined);

            const res = await service.handleIncomingWhatsappMessage({
                id: "in-msg-openwa-native",
                from: "919876543210@c.us",
                chatId: "919876543210@c.us",
                senderPhone: "919876543210",
                body: "APPROVE",
                quotedMessage: { id: "wa-msg-stage-1", body: "PO card" },
            });

            expect(res).toEqual({
                handled: true,
                action: "stage1_approved",
                purchaseOrderId: 42,
            });
        });
    });

    describe("Resend Approval Prompt", () => {
        it("rejects resend when Purchase Order is already approved", async () => {
            dbMock.select.mockReturnValueOnce(createQueryChain([{ id: 42, poApproved: true }]));

            await expect(service.resendActiveStagePrompt(42, 99)).rejects.toThrow(
                "Purchase Order is already approved"
            );
        });

        it("throws BadGatewayException when OpenWA delivery fails on resend", async () => {
            dbMock.select
                .mockReturnValueOnce(createQueryChain([{ id: 42, poApproved: null }]))
                .mockReturnValueOnce(
                    createQueryChain([{ id: 42, poNumber: "PO0042", poRaisedBy: 101, team: 1 }])
                )
                .mockReturnValueOnce(createQueryChain([]))
                .mockReturnValueOnce(createQueryChain([]))
                .mockReturnValueOnce(createQueryChain([{ name: "Creator" }]))
                .mockReturnValueOnce(
                    createQueryChain([
                        {
                            id: 5,
                            purchaseOrderId: 42,
                            version: 1,
                            status: "in_progress",
                            currentStage: 1,
                        },
                    ])
                )
                .mockReturnValueOnce(
                    createQueryChain([
                        {
                            id: 10,
                            workflowId: 5,
                            purchaseOrderId: 42,
                            stageOrder: 1,
                            stageRole: "tl",
                            status: "active",
                        },
                    ])
                );

            jest.spyOn(service, "resolveStage1Tl").mockResolvedValueOnce({
                userId: 15,
                name: "Vikram TL",
                mobile: "9876543210",
                jid: "919876543210@c.us",
            });
            notificationsMock.sendPoApprovalStageMessages.mockResolvedValueOnce({
                dmMessageId: null,
                dmChatId: "919876543210@c.us",
                dmSent: false,
                groupSent: false,
                dmError: "fetch failed",
                groupError: "fetch failed",
            });

            await expect(service.resendActiveStagePrompt(42, 99)).rejects.toThrow(
                "WhatsApp approval notification failed to deliver via OpenWA"
            );
        });
    });

    describe("In-App Lifecycle Sync", () => {
        it("cancels active WhatsApp workflow when PO is approved/rejected in-app", async () => {
            dbMock.select.mockReturnValueOnce(
                createQueryChain([
                    {
                        id: 5,
                        purchaseOrderId: 42,
                        status: "stage1_pending",
                        currentStage: 1,
                    },
                ])
            );

            await service.cancelWorkflowOnInAppDecision(42, 99, "approved");

            expect(dbMock.update).toHaveBeenCalledTimes(2);
            expect(dbMock.insert).toHaveBeenCalledTimes(1);
        });
    });
});
