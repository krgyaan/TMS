import { invoiceRemovalLeavesBareStock } from "./inventory.materialize";

describe("invoiceRemovalLeavesBareStock", () => {
    it("is unsafe when the last invoice of a materialized PO is removed", () => {
        expect(invoiceRemovalLeavesBareStock(0, true)).toBe(true);
    });

    it("is safe when other invoices remain against the PO", () => {
        expect(invoiceRemovalLeavesBareStock(1, true)).toBe(false);
    });

    it("is safe when the PO never materialized stock", () => {
        expect(invoiceRemovalLeavesBareStock(0, false)).toBe(false);
    });
});
