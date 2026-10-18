import type { DbInstance } from "@/db";
import { ENTITY_RESOLVER_MAP } from "./entity-resolvers";

type Row = Record<string, unknown>;

const createBuilder = (rows: Row[]) => {
    const builder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(rows),
        then: (onFulfilled: (value: Row[]) => unknown, onRejected: (reason: unknown) => unknown) => Promise.resolve(rows).then(onFulfilled, onRejected),
    };
    return builder;
};

const createDb = (...selectResults: Row[][]) => {
    const queue = [...selectResults];
    const select = jest.fn(() => createBuilder(queue.shift() ?? []));
    const db = { select } as unknown as DbInstance;
    return { db, select };
};

const prRow: Row = {
    id: 11,
    referenceNo: "PR/2025-26/0042",
    amount: "150000.00",
    partyName: "Shree Traders",
    category: "imprest",
    status: "pending",
    utrNumber: null,
    rejectionReason: null,
    remark: null,
    requestedByName: "Rahul Sharma",
    createdAt: new Date("2025-10-01T10:00:00Z"),
    updatedAt: new Date("2025-10-01T10:00:00Z"),
};

const poRow: Row = {
    id: 21,
    referenceNo: "PO/2025-26/0007",
    sellerName: "Acme Supplies",
    projectName: "Plant Expansion",
    category: "material",
    tdsPercentage: "2.00",
    tdsAmount: "3000.00",
    amountAfterTds: "147000.00",
    approvalFlag: null,
    approvalRemark: null,
    raisedByName: "Rahul Sharma",
    orderDate: "2025-10-02",
    createdAt: new Date("2025-10-02T09:00:00Z"),
    updatedAt: new Date("2025-10-02T09:00:00Z"),
};

const vwoRow: Row = {
    id: 31,
    referenceNo: "WO/2025-26/0003",
    sellerName: "Steel Fabricators",
    projectName: "Civil Works",
    category: "work",
    tdsPercentage: null,
    tdsAmount: null,
    amountAfterTds: null,
    approvalFlag: true,
    approvalRemark: "ok",
    raisedByName: "Amit Verma",
    orderDate: "2025-10-03",
    scopeOfWork: "Fabrication and erection",
    createdAt: new Date("2025-10-03T09:00:00Z"),
    updatedAt: new Date("2025-10-03T09:00:00Z"),
};

describe("ENTITY_RESOLVER_MAP", () => {
    it("registers a resolver for every supported entity type", () => {
        expect(Object.keys(ENTITY_RESOLVER_MAP).sort()).toEqual(["po", "pr", "tender", "vwo"]);
    });

    describe("pr resolver", () => {
        const resolve = ENTITY_RESOLVER_MAP.pr;

        it("returns the mapped payment request", async () => {
            const { db, select } = createDb([prRow]);

            const result = await resolve(db, 11);

            expect(result).toEqual(prRow);
            expect(select).toHaveBeenCalledTimes(1);
        });

        it("returns null when the record does not exist", async () => {
            const { db } = createDb([]);

            await expect(resolve(db, 999)).resolves.toBeNull();
        });
    });

    describe("po resolver", () => {
        const resolve = ENTITY_RESOLVER_MAP.po;

        it("computes the grand total and maps a pending approval", async () => {
            const { db, select } = createDb([poRow], [{ total: "150000.00" }]);

            const result = await resolve(db, 21);

            expect(result).toMatchObject({
                id: 21,
                referenceNo: "PO/2025-26/0007",
                grandTotal: "150000.00",
                approvalStatus: "pending",
            });
            expect(result).not.toHaveProperty("approvalFlag");
            expect(select).toHaveBeenCalledTimes(2);
        });

        it("maps true to approved", async () => {
            const { db } = createDb([{ ...poRow, approvalFlag: true }], [{ total: "10.00" }]);

            const result = await resolve(db, 21);

            expect(result).toMatchObject({ approvalStatus: "approved" });
        });

        it("maps false to rejected and handles a missing total", async () => {
            const { db } = createDb([{ ...poRow, approvalFlag: false }], []);

            const result = await resolve(db, 21);

            expect(result).toMatchObject({ approvalStatus: "rejected", grandTotal: null });
        });

        it("returns null when the PO does not exist", async () => {
            const { db } = createDb([]);

            await expect(resolve(db, 999)).resolves.toBeNull();
        });
    });

    describe("vwo resolver", () => {
        const resolve = ENTITY_RESOLVER_MAP.vwo;

        it("computes the grand total, approval status and scope of work", async () => {
            const { db } = createDb([vwoRow], [{ total: "250000.00" }]);

            const result = await resolve(db, 31);

            expect(result).toMatchObject({
                id: 31,
                grandTotal: "250000.00",
                approvalStatus: "approved",
                scopeOfWork: "Fabrication and erection",
            });
            expect(result).not.toHaveProperty("approvalFlag");
        });

        it("returns null when the WO does not exist", async () => {
            const { db } = createDb([]);

            await expect(resolve(db, 999)).resolves.toBeNull();
        });
    });
});
