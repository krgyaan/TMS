/// <reference types="jest" />
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { PurchaseOrderService } from "./purchase-order.service";

function createMockSelectChain(rows: any[]) {
    const chain: any = {
        from: jest.fn(() => chain),
        where: jest.fn(() => chain),
        limit: jest.fn(() => Promise.resolve(rows)),
        then: (resolve: (value: any[]) => any, reject?: (reason: any) => any) =>
            Promise.resolve(rows).then(resolve, reject),
    };
    return chain;
}

function createMockDb(selectResponses: any[][], returningRow: any = {}) {
    let selectIdx = 0;
    const updateCalls: Array<{ table: any; payload: any }> = [];

    const db: any = {
        select: jest.fn(() => {
            const rows = selectResponses[selectIdx++] ?? [];
            return createMockSelectChain(rows);
        }),
        update: jest.fn((table: any) => ({
            set: jest.fn((payload: any) => {
                updateCalls.push({ table, payload });
                return {
                    where: jest.fn(() => {
                        const result = [returningRow];
                        const whereResult: any = {
                            returning: jest.fn(() => Promise.resolve(result)),
                            then: (resolve: (value: any) => any, reject?: (reason: any) => any) =>
                                Promise.resolve(result).then(resolve, reject),
                        };
                        return whereResult;
                    }),
                };
            }),
        })),
    };

    return { db, updateCalls };
}

function makeUser(overrides: Partial<ValidatedUser> = {}): ValidatedUser {
    return {
        id: 10,
        name: "Test User",
        email: "test@example.com",
        role: "Team Leader",
        roleId: 3,
        teamId: 1,
        dataScope: "team",
        permissions: [],
        ...overrides,
    } as ValidatedUser;
}

describe("PurchaseOrderService.submitTlApproval", () => {
    const basePo = {
        id: 42,
        poNumber: "VE/SOLAR/2627/PO0042",
        sellerName: "ABC Enterprises",
        projectName: "Solar Plant",
        poRaisedBy: 99,
        team: 1,
        tlStatus: 0,
        tlComment: null,
        poApproved: null,
        poApprovalRemark: null,
    };

    const products = [{ qty: "1", rate: "100000.00", gstRate: "0", totalAmount: "100000.00", taxableAmount: "100000.00", gstAmount: "0.00" }];
    const extraCharges = [{ totalAmount: "5000.00" }];

    function buildService(selectResponses: any[][], returningRow: any = {}) {
        const { db, updateCalls } = createMockDb(selectResponses, returningRow);
        const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const notifications = {
            notifyPoTlDecision: jest.fn().mockResolvedValue(undefined),
        };
        const service = new PurchaseOrderService(
            db,
            logger as any,
            {} as any,
            {} as any,
            {} as any,
            notifications as any,
            {} as any
        );
        return { service, db, updateCalls, notifications };
    }

    it("allows Super User (roleId = 1) to approve a PO and triggers notifyPoTlDecision", async () => {
        const updatedPo = { ...basePo, tlStatus: 1, tlComment: "Looks good" };
        const { service, updateCalls, notifications } = buildService(
            [[basePo], [{ primaryTeamId: 2, team: 2 }], products, extraCharges],
            updatedPo
        );

        const result = await service.submitTlApproval(
            42,
            { tlStatus: 1, tlComment: "Looks good" },
            makeUser({ id: 1, role: "Super User", roleId: 1, teamId: 9 })
        );

        expect(result).toEqual(updatedPo);
        expect(updateCalls).toHaveLength(1);
        expect(updateCalls[0].payload).toMatchObject({
            tlStatus: 1,
            tlComment: "Looks good",
        });
        expect(notifications.notifyPoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                purchaseOrderId: 42,
                poNumber: "VE/SOLAR/2627/PO0042",
                grandTotal: "105000.00",
                tlStatus: 1,
                tlComment: "Looks good",
                actedBy: 1,
                createdBy: 99,
                teamId: 2,
            })
        );
    });

    it("allows Admin (roleId = 2) to approve a PO from any team", async () => {
        const updatedPo = { ...basePo, tlStatus: 1, tlComment: null };
        const { service, notifications } = buildService(
            [[basePo], [{ primaryTeamId: 4, team: 4 }], products, []],
            updatedPo
        );

        const result = await service.submitTlApproval(
            42,
            { tlStatus: 1 },
            makeUser({ id: 2, role: "Admin", roleId: 2, teamId: 1 })
        );

        expect(result).toEqual(updatedPo);
        expect(notifications.notifyPoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                purchaseOrderId: 42,
                grandTotal: "100000.00",
                tlStatus: 1,
                actedBy: 2,
            })
        );
    });

    it("allows same-team Team Leader (roleId = 3) to approve a PO", async () => {
        const updatedPo = { ...basePo, tlStatus: 1, tlComment: "Approved by TL" };
        const { service, notifications } = buildService(
            [[basePo], [{ primaryTeamId: 3, team: 3 }], products, []],
            updatedPo
        );

        const result = await service.submitTlApproval(
            42,
            { tlStatus: 1, tlComment: "Approved by TL" },
            makeUser({ id: 30, role: "Team Leader", roleId: 3, teamId: 3 })
        );

        expect(result).toEqual(updatedPo);
        expect(notifications.notifyPoTlDecision).toHaveBeenCalledTimes(1);
    });

    it("throws ForbiddenException for a Team Leader from a different team", async () => {
        const { service, notifications } = buildService([[basePo], [{ primaryTeamId: 2, team: 2 }]]);

        await expect(
            service.submitTlApproval(
                42,
                { tlStatus: 1 },
                makeUser({ id: 31, role: "Team Leader", roleId: 3, teamId: 5 })
            )
        ).rejects.toThrow(ForbiddenException);

        expect(notifications.notifyPoTlDecision).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException for a regular employee (roleId > 3) even on the same team", async () => {
        const { service, notifications } = buildService([[basePo], [{ primaryTeamId: 1, team: 1 }]]);

        await expect(
            service.submitTlApproval(
                42,
                { tlStatus: 1 },
                makeUser({ id: 50, role: "Operation Executive", roleId: 5, teamId: 1 })
            )
        ).rejects.toThrow(ForbiddenException);

        expect(notifications.notifyPoTlDecision).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when rejecting without a tlComment", async () => {
        const { service, notifications } = buildService([[basePo], [{ primaryTeamId: 1, team: 1 }]]);

        await expect(
            service.submitTlApproval(
                42,
                { tlStatus: 2, tlComment: "   " },
                makeUser({ id: 10, role: "Team Leader", roleId: 3, teamId: 1 })
            )
        ).rejects.toThrow(BadRequestException);

        expect(notifications.notifyPoTlDecision).not.toHaveBeenCalled();
    });

    it("on valid rejection sets tlStatus = 2, poApproved = false, rejects pending PRs, and notifies", async () => {
        const rejectedPo = {
            ...basePo,
            tlStatus: 2,
            tlComment: "Rate mismatch",
            poApproved: false,
            poApprovalRemark: "Rate mismatch",
        };
        const { service, updateCalls, notifications } = buildService(
            [[basePo], [{ primaryTeamId: 1, team: 1 }], products, []],
            rejectedPo
        );

        const result = await service.submitTlApproval(
            42,
            { tlStatus: 2, tlComment: "Rate mismatch" },
            makeUser({ id: 10, role: "Team Leader", roleId: 3, teamId: 1 })
        );

        expect(result).toEqual(rejectedPo);
        expect(updateCalls).toHaveLength(2);
        expect(updateCalls[0].payload).toMatchObject({
            tlStatus: 2,
            tlComment: "Rate mismatch",
            poApproved: false,
            poApprovalRemark: "Rate mismatch",
        });
        expect(updateCalls[1].payload).toMatchObject({
            status: "rejected",
            rejectionReason: "Rate mismatch",
        });
        expect(notifications.notifyPoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                purchaseOrderId: 42,
                tlStatus: 2,
                tlComment: "Rate mismatch",
                actedBy: 10,
            })
        );
    });

    it("throws BadRequestException if the PO is already finally approved by Accounts", async () => {
        const { service } = buildService([[{ ...basePo, poApproved: true }]]);

        await expect(
            service.submitTlApproval(
                42,
                { tlStatus: 1 },
                makeUser({ id: 1, role: "Super User", roleId: 1 })
            )
        ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when PO does not exist", async () => {
        const { service } = buildService([[]]);

        await expect(
            service.submitTlApproval(
                999,
                { tlStatus: 1 },
                makeUser({ id: 1, role: "Super User", roleId: 1 })
            )
        ).rejects.toThrow(NotFoundException);
    });

    it("persists structured multi-field rejection feedback (tlFeedback) and formatted tlComment", async () => {
        const rejectedPo = {
            ...basePo,
            tlStatus: 2,
            tlComment: "Unit Rates / Pricing: 10% above quotation | GST / Taxes: Use 18% GST",
            poApproved: false,
        };
        const { service, updateCalls, notifications } = buildService(
            [[basePo], [{ primaryTeamId: 1, team: 1 }], products, []],
            rejectedPo
        );

        await service.submitTlApproval(
            42,
            {
                tlStatus: 2,
                rejectionFields: [
                    { field: "pricing", label: "Unit Rates / Pricing", remark: "10% above quotation" },
                    { field: "gst_taxes", label: "GST / Taxes", remark: "Use 18% GST" },
                ],
            },
            makeUser({ id: 10, role: "Team Leader", roleId: 3, teamId: 1 })
        );

        expect(updateCalls[0].payload).toMatchObject({
            tlStatus: 2,
            tlComment: "Unit Rates / Pricing: 10% above quotation | GST / Taxes: Use 18% GST",
            poApproved: false,
            tlFeedback: expect.objectContaining({
                action: "reject",
                rejectionFields: [
                    { field: "pricing", label: "Unit Rates / Pricing", remark: "10% above quotation" },
                    { field: "gst_taxes", label: "GST / Taxes", remark: "Use 18% GST" },
                ],
            }),
        });
        expect(notifications.notifyPoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                tlStatus: 2,
                rejectionFields: [
                    { field: "pricing", label: "Unit Rates / Pricing", remark: "10% above quotation" },
                    { field: "gst_taxes", label: "GST / Taxes", remark: "Use 18% GST" },
                ],
            })
        );
    });

    it("supports Edit Requested (tlStatus = 3) with Old vs New field values and notifies GROUPS.POVWO", async () => {
        const editPo = {
            ...basePo,
            tlStatus: 3,
            tlComment: 'Delivery / Ship-To Address: "Warehouse A" → "Site Gate 3" (Confirmed with PM)',
        };
        const { service, updateCalls, notifications } = buildService(
            [[basePo], [{ primaryTeamId: 1, team: 1 }], products, []],
            editPo
        );

        const result = await service.submitTlApproval(
            42,
            {
                tlStatus: 3,
                editFields: [
                    {
                        field: "shippingAddress",
                        label: "Delivery / Ship-To Address",
                        oldValue: "Warehouse A",
                        newValue: "Site Gate 3",
                        remark: "Confirmed with PM",
                    },
                ],
            },
            makeUser({ id: 10, role: "Team Leader", roleId: 3, teamId: 1 })
        );

        expect(result).toEqual(editPo);
        expect(updateCalls).toHaveLength(1);
        expect(updateCalls[0].payload).toMatchObject({
            tlStatus: 3,
            tlComment: 'Delivery / Ship-To Address: "Warehouse A" → "Site Gate 3" (Confirmed with PM)',
            tlFeedback: expect.objectContaining({
                action: "edit",
                editFields: [
                    {
                        field: "shippingAddress",
                        label: "Delivery / Ship-To Address",
                        oldValue: "Warehouse A",
                        newValue: "Site Gate 3",
                        remark: "Confirmed with PM",
                    },
                ],
            }),
        });
        expect(notifications.notifyPoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                purchaseOrderId: 42,
                tlStatus: 3,
                editFields: [
                    expect.objectContaining({
                        field: "shippingAddress",
                        oldValue: "Warehouse A",
                        newValue: "Site Gate 3",
                    }),
                ],
            })
        );
    });
});
