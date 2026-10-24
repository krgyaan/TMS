import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Handlebars from "handlebars";
import {
    buildSaleInvoicePdfItems,
    buildSaleInvoiceTaxSummary,
    computeSaleInvoicePdfHash,
    getGstStateCode,
    isValidGstin,
    SaleInvoiceService,
    splitAddress,
} from "./sale-invoice.service";

const pdfItem = (
    overrides: Partial<{
        srNo: number | null;
        itemDescription: string | null;
        quantity: string | number | null;
        rate: string | number | null;
        gstRate: string | number | null;
        amount: string | number | null;
        gstAmount: string | number | null;
        totalAmount: string | number | null;
        unit: string | null;
        hsnSac: string | null;
    }> = {}
) => ({
    srNo: 1,
    itemDescription: "Widget",
    quantity: "2",
    rate: "100.00",
    gstRate: "18.00",
    amount: "200.00",
    gstAmount: "36.00",
    totalAmount: "236.00",
    unit: "EA",
    hsnSac: "1234",
    ...overrides,
});

describe("sale invoice PDF data helpers", () => {
    const templateSource = readFileSync(join(__dirname, "../../pdf/templates/si-template.hbs"), "utf8");

    const render = (isInterstate: boolean) => {
        const handlebars = Handlebars.create();
        handlebars.registerHelper("inc", (value: number) => value + 1);
        handlebars.registerHelper("formatDate", (value: string) => value || "");
        handlebars.registerHelper("formatCurrency", (value: number | string) => Number(value || 0).toFixed(2));
        return handlebars.compile(templateSource)({
            is_interstate: isInterstate,
            invoice_number: "SI/TEST/0001",
            invoice_date: "2026-10-23",
            items: [
                {
                    description: "Test widget",
                    quantity: 2,
                    rate: 100,
                    unit: "EA",
                    discount_percent: 0,
                    taxable_value: 200,
                    hsn_sac: "1234",
                    igst_rate: 18,
                    igst_amount: 36,
                    cgst_rate: 9,
                    cgst_amount: 18,
                    sgst_rate: 9,
                    sgst_amount: 18,
                    total: 236,
                },
            ],
            quantity: 2,
            line_item_subtotal: 236,
            taxable_value: 200,
            igst_rate: 18,
            igst_amount: 36,
            cgst_rate: 9,
            cgst_amount: 18,
            sgst_rate: 9,
            sgst_amount: 18,
            total_tax_amount: 36,
            grand_total: 236,
            amount_in_words: "Two hundred thirty six",
            tax_amount_in_words: "Thirty six",
            seller_name: "Volks Energie Pvt. Ltd.",
            seller_state: "Delhi",
            seller_state_code: "07",
            buyer_name: "Buyer",
            buyer_state: "Karnataka",
        });
    };

    it("extracts a valid GST state code and rejects malformed GSTINs", () => {
        expect(getGstStateCode("29ABCDE1234F1ZW")).toBe("29");
        expect(getGstStateCode("25ABCDE1234F1Z4")).toBe("25");
        expect(getGstStateCode("29ABCDE1234F1Z")).toBeNull();
        expect(getGstStateCode("29ABCDEAB34F1Z5")).toBeNull();
        expect(isValidGstin("29ABCDE1234F1Z5")).toBe(false);
        expect(getGstStateCode(undefined)).toBeNull();
    });

    it("splits addresses into three printable lines without losing overflow", () => {
        expect(splitAddress("Unit 4, Industrial Estate, Bengaluru, Karnataka 560001")).toEqual(["Unit 4", "Industrial Estate", "Bengaluru, Karnataka 560001"]);
    });

    it("allocates interstate tax to IGST", () => {
        const [item] = buildSaleInvoicePdfItems([pdfItem()], true);

        expect(item.igst_rate).toBe(18);
        expect(item.igst_amount).toBe(36);
        expect(item.cgst_amount).toBe(0);
        expect(item.sgst_amount).toBe(0);
    });

    it("splits intrastate tax evenly and assigns rounding remainder to SGST", () => {
        const [item] = buildSaleInvoicePdfItems([pdfItem({ gstRate: "5", gstAmount: "5.01" })], false);

        expect(item.igst_amount).toBe(0);
        expect(item.cgst_rate).toBe(2.5);
        expect(item.sgst_rate).toBe(2.5);
        expect(item.cgst_amount).toBe(2.51);
        expect(item.sgst_amount).toBe(2.5);
        expect(item.cgst_amount + item.sgst_amount).toBe(5.01);
    });

    it("groups tax summary amounts by GST rate", () => {
        const rows = buildSaleInvoicePdfItems([pdfItem(), pdfItem({ srNo: 2, gstRate: "5", amount: "100", gstAmount: "5", totalAmount: "105" })], true);
        const summary = buildSaleInvoiceTaxSummary(rows);

        expect(summary.map(row => row.rate)).toEqual([5, 18]);
        expect(summary.map(row => row.tax_amount)).toEqual([5, 36]);
    });

    it("produces stable hashes for identical rendered data and new hashes for changed content", () => {
        const data = { invoice_number: "SI/TEST/0001", grand_total: 236 };

        expect(computeSaleInvoicePdfHash(data)).toBe(computeSaleInvoicePdfHash(data));
        expect(computeSaleInvoicePdfHash({ ...data, grand_total: 240 })).not.toBe(computeSaleInvoicePdfHash(data));
    });

    it.each([false, true])("renders the %s GST layout without sample constants", isInterstate => {
        const html = render(isInterstate);

        expect(html).toContain("Test widget");
        expect(html).toContain(isInterstate ? 'colspan="11"' : 'colspan="13"');
        expect(html).not.toMatch(/-0\.20|Plot 10\/1A|GROUND AND 1ST FLOOR/);
    });

    it("builds the production PDF payload using billing GSTIN jurisdiction", async () => {
        const db = {
            select: () => ({
                from: () => ({
                    where: () => Promise.resolve([{ projectName: "Test Project", projectCode: "TP-1" }]),
                }),
            }),
        };
        const generator = { grandTotalInWords: (value: number) => value.toString() };
        const service = new SaleInvoiceService(db as never, {} as never, generator as never);
        const invoice = {
            id: 1,
            invoiceNumber: "SI/TEST/0001",
            invoiceDate: "2026-10-23",
            billingCustomerName: "Buyer",
            billingAddress: "Unit 4, Industrial Estate",
            billingGst: "29ABCDE1234F1ZW",
            projectId: 1,
            raisedBy: null,
            approvedBy: null,
            generatedPdfVersions: {},
            transporterDetails: null,
            grandTotal: "236.00",
            freight: "0",
            otherCharges: "0",
            roundOff: "0",
        };
        const data = await service["buildSiPdfData"](invoice, [pdfItem()]);
        const rows = data.items;

        expect(data["is_interstate"]).toBe(true);
        expect(data["project_code"]).toBe("TP-1");
        expect(data["buyer_address_line1"]).toBe("Unit 4");
        expect(rows[0].igst_amount).toBe(36);
        expect(rows[0].cgst_amount).toBe(0);
    });

    it("rejects payload generation when billing GSTIN is missing or invalid", async () => {
        const service = new SaleInvoiceService({} as never, {} as never, {} as never);
        await expect(service["buildSiPdfData"]({ billingGst: "29ABCDE1234F1Z5" }, [])).rejects.toThrow("valid billing GSTIN");
    });
});
