/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { BadRequestException } from "@nestjs/common";
import { PurchaseOrderService } from "./purchase-order.service";

/**
 * These cover the duplicate-vendor-org fix in createParty: the PO "Add new
 * seller" dialog must reuse an existing org (matched case/edge-whitespace
 * insensitively) instead of inserting a second row that later crashes PO
 * creation on the unique index.
 */
describe("PurchaseOrderService.createParty", () => {
    let service: PurchaseOrderService;
    let db: any;
    let logger: any;
    let clientDirectory: any;

    const buildDb = () => {
        const limit = jest.fn();
        const orderBy = jest.fn().mockReturnValue({ limit });
        const where = jest.fn().mockReturnValue({ orderBy });
        const from = jest.fn().mockReturnValue({ where });
        const select = jest.fn().mockReturnValue({ from });

        const valuesOrg = jest.fn();
        const orgInsert = { values: valuesOrg.mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 10, name: "Acme", status: true }]) }) };
        const vendorInsert = { values: jest.fn().mockResolvedValue(undefined) };
        const gstInsert = { values: jest.fn().mockResolvedValue(undefined) };
        const insert = jest.fn().mockReturnValueOnce(orgInsert).mockReturnValueOnce(vendorInsert).mockReturnValueOnce(gstInsert);

        const updateWhere = jest.fn().mockResolvedValue(undefined);
        const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
        const update = jest.fn().mockReturnValue({ set: updateSet });

        const tx = { insert };
        const transaction = jest.fn().mockImplementation((cb: (t: any) => unknown) => cb(tx));

        return { select, limit, insert, valuesOrg, update, updateSet, transaction, tx };
    };

    beforeEach(() => {
        db = buildDb();
        logger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
        clientDirectory = { syncToClientDirectory: jest.fn().mockResolvedValue(undefined) };
        service = new PurchaseOrderService(db, logger, {} as any, clientDirectory, {} as any, {} as any, {} as any);
    });

    it("reuses an existing active org instead of inserting a duplicate", async () => {
        db.limit.mockResolvedValue([{ id: 5, name: "Acme Traders", status: true }]);

        const result = await service.createParty({ type: "seller", name: "  Acme Traders  " });

        expect(result).toMatchObject({ id: 5, type: "seller", source: "vendor_org" });
        expect(db.insert).not.toHaveBeenCalled();
        expect(db.transaction).not.toHaveBeenCalled();
        expect(clientDirectory.syncToClientDirectory).not.toHaveBeenCalled();
    });

    it("reactivates an inactive org when the name matches", async () => {
        db.limit.mockResolvedValue([{ id: 5, name: "Acme Traders", status: false }]);

        const result = await service.createParty({ type: "seller", name: "Acme Traders" });

        expect(result).toMatchObject({ id: 5, status: true });
        expect(db.update).toHaveBeenCalledTimes(1);
        expect(db.insert).not.toHaveBeenCalled();
    });

    it("inserts a new org, its contact person and GST inside a transaction", async () => {
        db.limit.mockResolvedValue([]);

        const result = await service.createParty({
            type: "seller",
            name: "  New Vendor  ",
            contact_person: "Jane",
            email: "jane@example.com",
            mobile_number: "999",
            gstNo: "27ABCDE1234F1Z5",
        });

        expect(db.transaction).toHaveBeenCalledTimes(1);
        expect(db.insert).toHaveBeenCalledTimes(3);
        expect(db.valuesOrg.mock.calls[0][0]).toMatchObject({ name: "New Vendor" });
        expect(result).toMatchObject({ id: 10, type: "seller", source: "vendor_org" });
        expect(clientDirectory.syncToClientDirectory).toHaveBeenCalledTimes(1);
    });

    it("recovers from a unique violation race by returning the winning row", async () => {
        db.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 7, name: "Acme", status: true }]);
        const raceError = Object.assign(new Error("duplicate key"), { code: "23505" });
        db.transaction.mockRejectedValueOnce(raceError);

        const result = await service.createParty({ type: "seller", name: "Acme" });

        expect(result).toMatchObject({ id: 7, type: "seller", source: "vendor_org" });
    });

    it("rejects an empty seller name", async () => {
        await expect(service.createParty({ type: "seller", name: "   " })).rejects.toBeInstanceOf(BadRequestException);
        expect(db.insert).not.toHaveBeenCalled();
    });
});
