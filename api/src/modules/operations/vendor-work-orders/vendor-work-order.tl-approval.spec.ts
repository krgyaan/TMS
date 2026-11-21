/// <reference types="jest" />
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { VendorWorkOrderService } from "./vendor-work-order.service";

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

describe("VendorWorkOrderService.submitTlApproval", () => {
    const baseVwo = {
        id: 77,
        woNumber: "VE/SOLAR/2627/WO0077",
        sellerName: "XYZ Contractors",
        projectName: "Solar Plant",
        woRaisedBy: 88,
        team: 1,
        tlStatus: 0,
        tlComment: null,
        woApproved: null,
        woApprovalRemark: null,
    };

    const items = [{ totalAmount: "80000.00" }];
    const extraCharges = [{ totalAmount: "2500.00" }];

    function buildService(selectResponses: any[][], returningRow: any = {}) {
        const { db, updateCalls } = createMockDb(selectResponses, returningRow);
        const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const notifications = {
            notifyVwoTlDecision: jest.fn().mockResolvedValue(undefined),
        };
        const service = new VendorWorkOrderService(
            db,
            logger as any,
            {} as any,
            {} as any,
            notifications as any,
            {} as any
        );
        return { service, db, updateCalls, notifications };
    }

    it("allows Super User (roleId = 1) to approve a VWO and triggers notifyVwoTlDecision", async () => {
        const updatedVwo = { ...baseVwo, tlStatus: 1, tlComment: "Verified scope" };
        const { service, updateCalls, notifications } = buildService(
            [[baseVwo], [{ primaryTeamId: 2, team: 2 }], items, extraCharges],
            updatedVwo
        );

        const result = await service.submitTlApproval(
            77,
            { tlStatus: 1, tlComment: "Verified scope" },
            makeUser({ id: 1, role: "Super User", roleId: 1, teamId: 9 })
        );

        expect(result).toEqual(updatedVwo);
        expect(updateCalls).toHaveLength(1);
        expect(updateCalls[0].payload).toMatchObject({
            tlStatus: 1,
            tlComment: "Verified scope",
        });
        expect(notifications.notifyVwoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                vendorWorkOrderId: 77,
                woNumber: "VE/SOLAR/2627/WO0077",
                grandTotal: "82500.00",
                tlStatus: 1,
                tlComment: "Verified scope",
                actedBy: 1,
                createdBy: 88,
                teamId: 2,
            })
        );
    });

    it("allows Admin (roleId = 2) to approve a VWO from any team", async () => {
        const updatedVwo = { ...baseVwo, tlStatus: 1, tlComment: null };
        const { service, notifications } = buildService(
            [[baseVwo], [{ primaryTeamId: 4, team: 4 }], items, []],
            updatedVwo
        );

        const result = await service.submitTlApproval(
            77,
            { tlStatus: 1 },
            makeUser({ id: 2, role: "Admin", roleId: 2, teamId: 1 })
        );

        expect(result).toEqual(updatedVwo);
        expect(notifications.notifyVwoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                vendorWorkOrderId: 77,
                grandTotal: "80000.00",
                tlStatus: 1,
                actedBy: 2,
            })
        );
    });

    it("allows same-team Team Leader (roleId = 3) to approve a VWO", async () => {
        const updatedVwo = { ...baseVwo, tlStatus: 1, tlComment: "OK" };
        const { service, notifications } = buildService(
            [[baseVwo], [{ primaryTeamId: 3, team: 3 }], items, []],
            updatedVwo
        );

        const result = await service.submitTlApproval(
            77,
            { tlStatus: 1, tlComment: "OK" },
            makeUser({ id: 30, role: "Team Leader", roleId: 3, teamId: 3 })
        );

        expect(result).toEqual(updatedVwo);
        expect(notifications.notifyVwoTlDecision).toHaveBeenCalledTimes(1);
    });

    it("throws ForbiddenException for a Team Leader from a different team", async () => {
        const { service, notifications } = buildService([[baseVwo], [{ primaryTeamId: 2, team: 2 }]]);

        await expect(
            service.submitTlApproval(
                77,
                { tlStatus: 1 },
                makeUser({ id: 31, role: "Team Leader", roleId: 3, teamId: 5 })
            )
        ).rejects.toThrow(ForbiddenException);

        expect(notifications.notifyVwoTlDecision).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException for a regular employee (roleId > 3) even on the same team", async () => {
        const { service, notifications } = buildService([[baseVwo], [{ primaryTeamId: 1, team: 1 }]]);

        await expect(
            service.submitTlApproval(
                77,
                { tlStatus: 1 },
                makeUser({ id: 50, role: "Operation Executive", roleId: 5, teamId: 1 })
            )
        ).rejects.toThrow(ForbiddenException);

        expect(notifications.notifyVwoTlDecision).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when rejecting without a tlComment", async () => {
        const { service, notifications } = buildService([]);

        await expect(
            service.submitTlApproval(
                77,
                { tlStatus: 2, tlComment: "   " },
                makeUser({ id: 10, role: "Team Leader", roleId: 3, teamId: 1 })
            )
        ).rejects.toThrow(BadRequestException);

        expect(notifications.notifyVwoTlDecision).not.toHaveBeenCalled();
    });

    it("on valid rejection sets tlStatus = 2, woApproved = false, rejects pending PRs, and notifies", async () => {
        const rejectedVwo = {
            ...baseVwo,
            tlStatus: 2,
            tlComment: "Scope incomplete",
            woApproved: false,
            woApprovalRemark: "Scope incomplete",
        };
        const { service, updateCalls, notifications } = buildService(
            [[baseVwo], [{ primaryTeamId: 1, team: 1 }], items, []],
            rejectedVwo
        );

        const result = await service.submitTlApproval(
            77,
            { tlStatus: 2, tlComment: "Scope incomplete" },
            makeUser({ id: 10, role: "Team Leader", roleId: 3, teamId: 1 })
        );

        expect(result).toEqual(rejectedVwo);
        expect(updateCalls).toHaveLength(2);
        expect(updateCalls[0].payload).toMatchObject({
            tlStatus: 2,
            tlComment: "Scope incomplete",
            woApproved: false,
            woApprovalRemark: "Scope incomplete",
        });
        expect(updateCalls[1].payload).toMatchObject({
            status: "rejected",
            rejectionReason: "Scope incomplete",
        });
        expect(notifications.notifyVwoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                vendorWorkOrderId: 77,
                tlStatus: 2,
                tlComment: "Scope incomplete",
                actedBy: 10,
            })
        );
    });

    it("throws BadRequestException if the VWO is already finally approved by Accounts", async () => {
        const { service } = buildService([[{ ...baseVwo, woApproved: true }]]);

        await expect(
            service.submitTlApproval(
                77,
                { tlStatus: 1 },
                makeUser({ id: 1, role: "Super User", roleId: 1 })
            )
        ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when VWO does not exist", async () => {
        const { service } = buildService([[]]);

        await expect(
            service.submitTlApproval(
                999,
                { tlStatus: 1 },
                makeUser({ id: 1, role: "Super User", roleId: 1 })
            )
        ).rejects.toThrow(NotFoundException);
    });

    it("supports Edit Requested (tlStatus = 3) with Old vs New field values and notifies GROUPS.POVWO", async () => {
        const editVwo = {
            ...baseVwo,
            tlStatus: 3,
            tlComment: 'Unit Rates / Pricing: "₹80,000" → "₹75,000" (As per negotiated quote)',
        };
        const { service, updateCalls, notifications } = buildService(
            [[baseVwo], [{ primaryTeamId: 1, team: 1 }], items, []],
            editVwo
        );

        const result = await service.submitTlApproval(
            77,
            {
                tlStatus: 3,
                editFields: [
                    {
                        field: "pricing",
                        label: "Unit Rates / Pricing",
                        oldValue: "₹80,000",
                        newValue: "₹75,000",
                        remark: "As per negotiated quote",
                    },
                ],
            },
            makeUser({ id: 10, role: "Team Leader", roleId: 3, teamId: 1 })
        );

        expect(result).toEqual(editVwo);
        expect(updateCalls).toHaveLength(1);
        expect(updateCalls[0].payload).toMatchObject({
            tlStatus: 3,
            tlComment: 'Unit Rates / Pricing: "₹80,000" → "₹75,000" (As per negotiated quote)',
            tlFeedback: expect.objectContaining({
                action: "edit",
                editFields: [
                    {
                        field: "pricing",
                        label: "Unit Rates / Pricing",
                        oldValue: "₹80,000",
                        newValue: "₹75,000",
                        remark: "As per negotiated quote",
                    },
                ],
            }),
        });
        expect(notifications.notifyVwoTlDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                vendorWorkOrderId: 77,
                tlStatus: 3,
                editFields: [
                    expect.objectContaining({
                        field: "pricing",
                        oldValue: "₹80,000",
                        newValue: "₹75,000",
                    }),
                ],
            })
        );
    });
});
