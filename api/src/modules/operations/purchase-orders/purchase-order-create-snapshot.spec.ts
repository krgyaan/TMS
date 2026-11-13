/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { PurchaseOrderService } from "./purchase-order.service";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";

/**
 * A PO must store the seller/ship-to snapshot exactly as submitted by the
 * create form, together with the selected master ids. Contact edits must not
 * spill into client_directory.
 */
describe("PurchaseOrderService.createPurchaseOrder snapshot", () => {
    let service: PurchaseOrderService;
    let poValues: jest.Mock;
    let clientDirectory: any;

    const awaitable = (rows: any[]) => {
        const promise: any = Promise.resolve(rows);
        promise.limit = jest.fn().mockResolvedValue(rows);
        promise.orderBy = jest.fn().mockResolvedValue(rows);
        return promise;
    };

    const buildDb = () => {
        const select = jest.fn(() => ({ from: () => ({ where: () => awaitable([]) }) }));
        const insert = jest.fn((table: unknown) => {
            if (table === purchaseOrders) {
                return {
                    values: (values: any) => {
                        poValues(values);
                        return { returning: () => Promise.resolve([{ id: 77, ...values, generatedPdfVersions: {} }]) };
                    },
                };
            }
            return { values: jest.fn().mockResolvedValue(undefined) };
        });
        const update = jest.fn(() => ({ set: () => ({ where: () => Promise.resolve(undefined) }) }));
        return { select, insert, update };
    };

    beforeEach(() => {
        poValues = jest.fn();
        clientDirectory = { syncToClientDirectory: jest.fn().mockResolvedValue(undefined) };
        const db = buildDb();
        const logger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const notifications = { notifyPoCreated: jest.fn().mockResolvedValue(undefined) };
        const cashFlow = { create: jest.fn().mockResolvedValue(undefined) };
        service = new PurchaseOrderService(db as any, logger as any, {} as any, clientDirectory, {} as any, notifications as any, cashFlow as any);
        jest.spyOn(service as any, "generatePdfForPO").mockResolvedValue({ generated: false });
        jest.spyOn(service, "getPurchaseOrder").mockResolvedValue({ id: 77 } as any);
    });

    it("persists the submitted snapshot + party ids and does not write client_directory", async () => {
        await service.createPurchaseOrder(
            {
                tenderId: 3232,
                projectName: "BEL Chennai VRF",
                poDate: "2026-11-12",
                sellerOrganizationId: 59,
                sellerGstId: 60,
                vendorPersonId: 118,
                shipToPartyId: 458,
                sellerName: "LG Electronics India Ltd",
                sellerEmail: "jigar.patel@lge.com",
                sellerAddress: "12 Floor, KP Towers, Noida",
                sellerGstNo: "09AAACL1745Q3Z0",
                sellerPanNo: "AAACL1745Q",
                sellerMsmeNo: "UDYAM-UP-00-0000000",
                sellerCinNo: "U12345UP2020PTC123456",
                contactPersonName: "Guddi Kumari",
                contactPersonPhone: "7982146685",
                contactPersonEmail: "guddi@volksenergie.in",
                vendorContactPersonName: "Amresh Kumar Jha",
                vendorContactPersonPhone: "7549829531",
                vendorContactPersonEmail: "amresh.kumar@lge.com",
                shipToName: "Bel Chennai",
                shippingAddress: "BEL Army Road Nandambakkam, Chennai",
                shipToGst: "33AAACB5985C1ZW",
                shipToPan: "AAACB5985C",
                products: [{ description: "16 HP Outdoor Unit", qty: 4, rate: 202004, gstRate: 18 }],
            },
            7
        );

        expect(poValues).toHaveBeenCalledWith(
            expect.objectContaining({
                sellerOrganizationId: 59,
                sellerGstId: 60,
                vendorPersonId: 118,
                shipToPartyId: 458,
                sellerName: "LG Electronics India Ltd",
                sellerAddress: "12 Floor, KP Towers, Noida",
                sellerGstNo: "09AAACL1745Q3Z0",
                sellerPanNo: "AAACL1745Q",
                sellerMsmeNo: "UDYAM-UP-00-0000000",
                sellerCinNo: "U12345UP2020PTC123456",
                vendorContactPersonName: "Amresh Kumar Jha",
                vendorContactPersonPhone: "7549829531",
                vendorContactPersonEmail: "amresh.kumar@lge.com",
                shipToName: "Bel Chennai",
                shippingAddress: "BEL Army Road Nandambakkam, Chennai",
                shipToGst: "33AAACB5985C1ZW",
                shipToPan: "AAACB5985C",
            })
        );
        expect(clientDirectory.syncToClientDirectory).not.toHaveBeenCalled();
    });
});
