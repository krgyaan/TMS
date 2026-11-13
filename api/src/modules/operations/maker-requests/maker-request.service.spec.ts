import { MakerRequestService } from "./maker-request.service";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";
import { instrumentTransferDetails, paymentInstruments } from "@/db/schemas/tendering/payment-requests.schema";
import { COMMON_STATUSES } from "@/modules/tendering/payment-requests/constants/payment-request-statuses";

describe("MakerRequestService.updateStatus instrument sync", () => {
    const paymentDate = new Date("2026-01-01T10:00:00.000Z");

    function setup(options: {
        status: string;
        body: { status: string; utrNumber?: string; rejectionReason?: string };
        instruments?: any[];
        transferDetail?: { id: number } | null;
    }) {
        const instrumentUpdates: any[] = [];
        const transferUpdates: any[] = [];
        const transferInserts: any[] = [];

        const existing = {
            id: 42,
            projectId: null,
            status: options.status,
            requestNo: "MR/2526/0001",
            amount: "5000.00",
            partyName: "Acme",
            portalLink: null,
            requestedBy: 1,
            paymentAgainst: "po",
        };

        const updatedRow = {
            ...existing,
            status: options.body.status,
            utrNumber: options.body.utrNumber ?? null,
            rejectionReason: options.body.rejectionReason ?? null,
            updatedAt: paymentDate,
        };

        const tx = {
            update: (table: any) => ({
                set: (values: any) => ({
                    where: () => {
                        if (table === paymentInstruments) instrumentUpdates.push(values);
                        if (table === instrumentTransferDetails) transferUpdates.push(values);
                        return { returning: () => Promise.resolve([updatedRow]) };
                    },
                }),
            }),
            select: () => ({
                from: (table: any) => ({
                    where: () => {
                        const value =
                            table === paymentInstruments
                                ? options.instruments ?? []
                                : table === instrumentTransferDetails
                                    ? options.transferDetail
                                        ? [options.transferDetail]
                                        : []
                                    : [];
                        return {
                            then: (onFulfilled: (rows: any[]) => unknown) => Promise.resolve(value).then(onFulfilled),
                            limit: () => Promise.resolve(value),
                        };
                    },
                }),
            }),
            insert: (table: any) => ({
                values: (values: any) => {
                    if (table === instrumentTransferDetails) transferInserts.push(values);
                    return Promise.resolve();
                },
            }),
        };

        const db = {
            transaction: (cb: (trx: any) => unknown) => cb(tx),
            select: () => ({
                from: (table: any) => ({
                    where: () => ({
                        then: (onFulfilled: (rows: any[]) => unknown) =>
                            Promise.resolve(table === paymentRequests ? [existing] : []).then(onFulfilled),
                        limit: () => Promise.resolve(table === paymentRequests ? [existing] : []),
                    }),
                }),
            }),
            update: () => ({
                set: () => ({
                    where: () => Promise.resolve(),
                }),
            }),
        };

        const notifications = {
            notifyPaymentDone: jest.fn().mockResolvedValue(undefined),
            notifyRejection: jest.fn().mockResolvedValue(undefined),
            notifyMakerDone: jest.fn().mockResolvedValue(undefined),
        };
        const logger = { info: jest.fn(), warn: jest.fn(), log: jest.fn(), error: jest.fn(), debug: jest.fn() };

        const service = new MakerRequestService(db as any, logger as any, {} as any, notifications as any);

        return { service, instrumentUpdates, transferUpdates, transferInserts, notifications };
    }

    it("marks the linked instrument accepted when the maker request is maker_done", async () => {
        const { service, instrumentUpdates } = setup({
            status: "pending",
            body: { status: "maker_done" },
            instruments: [{ id: 7, legacyData: null }],
        });

        await service.updateStatus(42, { status: "maker_done" }, 1);

        expect(instrumentUpdates).toHaveLength(1);
        expect(instrumentUpdates[0]).toMatchObject({
            status: COMMON_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            action: 1,
        });
        expect(instrumentUpdates[0].utr).toBeUndefined();
    });

    it("marks the linked instrument accepted with UTR and payment date when payment_done", async () => {
        const { service, instrumentUpdates, transferUpdates } = setup({
            status: "maker_done",
            body: { status: "payment_done", utrNumber: "UTR123" },
            instruments: [{ id: 7, legacyData: { existing: true } }],
            transferDetail: { id: 99 },
        });

        await service.updateStatus(42, { status: "payment_done", utrNumber: "UTR123" }, 1);

        expect(instrumentUpdates[0]).toMatchObject({
            status: COMMON_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            action: 1,
            utr: "UTR123",
        });
        expect(instrumentUpdates[0].legacyData).toEqual({
            existing: true,
            date_time: paymentDate.toISOString(),
        });
        expect(transferUpdates[0]).toMatchObject({
            utrNum: "UTR123",
            transactionDate: paymentDate,
        });
    });

    it("inserts transfer details when none exist for payment_done", async () => {
        const { service, transferInserts } = setup({
            status: "maker_done",
            body: { status: "payment_done", utrNumber: "UTR123" },
            instruments: [{ id: 7, legacyData: null }],
            transferDetail: null,
        });

        await service.updateStatus(42, { status: "payment_done", utrNumber: "UTR123" }, 1);

        expect(transferInserts).toEqual([
            {
                instrumentId: 7,
                utrNum: "UTR123",
                transactionDate: paymentDate,
            },
        ]);
    });

    it("marks the linked instrument rejected with the rejection reason", async () => {
        const { service, instrumentUpdates } = setup({
            status: "pending",
            body: { status: "rejected", rejectionReason: "Invalid invoice" },
            instruments: [{ id: 7, legacyData: null }],
        });

        await service.updateStatus(42, { status: "rejected", rejectionReason: "Invalid invoice" }, 1);

        expect(instrumentUpdates[0]).toMatchObject({
            status: COMMON_STATUSES.ACCOUNTS_FORM_REJECTED,
            action: 1,
            rejectionReason: "Invalid invoice",
        });
    });

    it("does nothing when the maker request has no linked instrument", async () => {
        const { service, instrumentUpdates } = setup({
            status: "pending",
            body: { status: "maker_done" },
            instruments: [],
        });

        await expect(service.updateStatus(42, { status: "maker_done" }, 1)).resolves.toBeDefined();
        expect(instrumentUpdates).toHaveLength(0);
    });
});
