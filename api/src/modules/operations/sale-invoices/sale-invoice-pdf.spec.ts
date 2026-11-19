import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Handlebars from "handlebars";
import { getPdfMargins, isLandscape } from "@/modules/pdf/config/pdf-config";
import { aggregateSaleInvoiceItemsByBoq, buildSaleInvoiceHsnSummary, buildSaleInvoicePdfItems, computeSaleInvoicePdfHash, getGstStateCode, isValidGstin, resolveSaleInvoiceItems, SaleInvoiceService } from "./sale-invoice.service";

const pdfItem = (
    overrides: Partial<{
        srNo: number | null;
        lineItemSrNo: number;
        purchaseOrderProductId: number;
        itemDescription: string | null;
        quantity: string | number | null;
        rate: string | number | null;
        gstRate: string | number | null;
        amount: string | number | null;
        discountPercent: string | number | null;
        discountAmount: string | number | null;
        gstAmount: string | number | null;
        totalAmount: string | number | null;
        unit: string | null;
        hsnSac: string | null;
    }> = {}
) => ({
    srNo: 1,
    lineItemSrNo: 7,
    purchaseOrderProductId: 88,
    itemDescription: "Widget",
    quantity: "2",
    rate: "100.00",
    gstRate: "18.00",
    amount: "200.00",
    discountPercent: "0",
    discountAmount: "0",
    gstAmount: "36.00",
    totalAmount: "236.00",
    unit: "EA",
    hsnSac: "1234",
    ...overrides,
});

describe("sale invoice PDF data helpers", () => {
    const templateSource = readFileSync(join(__dirname, "../../pdf/templates/si-portrait.hbs"), "utf8");

    const render = (isInterstate: boolean, boqItemName = "Test BOQ item") => {
        const handlebars = Handlebars.create();
        handlebars.registerHelper("inc", (value: number) => value + 1);
        handlebars.registerHelper("formatDate", (value: string) => value || "");
        handlebars.registerHelper("formatCurrency", (value: number | string) => Number(value || 0).toFixed(2));
        return handlebars.compile(templateSource)({
            is_interstate: isInterstate,
            invoice_number: "SI/TEST/0001",
            invoice_date: "2026-10-23",
            project_manager: "Priya Manager",
            project_manager_phone: "9876543210",
            project_manager_email: "priya@example.com",
            transporter_mode: "Road",
            items: [
                {
                    description: "Test widget",
                    boq_item_name: boqItemName,
                    po_item_description: "Test PO description",
                    quantity: 2,
                    boq_quantity: 10,
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
            hsn_summary: [
                {
                    hsn_sac: "1234",
                    rate: 18,
                    taxable_value: 200,
                    igst_amount: 36,
                    cgst_amount: 18,
                    sgst_amount: 18,
                    tax_amount: 36,
                },
            ],
            grand_total: 236,
            amount_in_words: "Two hundred thirty six",
            tax_amount_in_words: "Thirty six",
            seller_name: "Volks Energie Pvt. Ltd.",
            seller_state: "Delhi",
            seller_state_code: "07",
            buyer_name: "Buyer",
            buyer_address: "Buyer line one\nBuyer line two",
            buyer_state: "Karnataka",
            buyer_place_of_supply: "Bengaluru",
            buyer_contact_person: "Buyer Contact",
            buyer_phone: "9876500001",
            consignee_name: "Consignee",
            consignee_address: "Consignee line one\nConsignee line two",
            consignee_state: "Tamil Nadu",
            consignee_place_of_supply: "Chennai",
            consignee_contact_person: "Consignee Contact",
            consignee_phone: "9876500002",
            dispatch_from_name: "Dispatch warehouse",
            dispatch_address: "Dispatch line one\nDispatch line two",
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

    it("uses portrait orientation only for sale-invoice PDFs", () => {
        expect(isLandscape("si")).toBe(false);
        expect(isLandscape("po")).toBe(false);
        expect(isLandscape("unknown")).toBe(false);
        expect(getPdfMargins("si")).toEqual({ top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" });
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

    it("groups the HSN summary by HSN/SAC", () => {
        const rows = buildSaleInvoicePdfItems(
            [
                pdfItem({ hsnSac: "1234", amount: "200", gstAmount: "36" }),
                pdfItem({ srNo: 2, hsnSac: "1234", amount: "100", gstAmount: "18" }),
                pdfItem({ srNo: 3, hsnSac: "5678", amount: "100", gstAmount: "5", gstRate: "5" }),
            ],
            true,
        );
        const summary = buildSaleInvoiceHsnSummary(rows);

        expect(summary.map(row => row.hsn_sac)).toEqual(["1234", "5678"]);
        expect(summary.map(row => row.taxable_value)).toEqual([300, 100]);
        expect(summary.map(row => row.tax_amount)).toEqual([54, 5]);
    });

    it("uses an em dash for items without an HSN and sorts it last", () => {
        const rows = buildSaleInvoicePdfItems(
            [
                pdfItem({ hsnSac: "" }),
                pdfItem({ srNo: 2, hsnSac: "1234" }),
            ],
            false,
        );
        const summary = buildSaleInvoiceHsnSummary(rows);

        expect(summary.map(row => row.hsn_sac)).toEqual(["1234", "—"]);
    });

    it("applies a pre-GST discount when computing the taxable value", () => {
        const [item] = buildSaleInvoicePdfItems(
            [pdfItem({ amount: "200", discountPercent: "10", discountAmount: null, gstAmount: null, totalAmount: null })],
            true,
        );

        expect(item.discount_percent).toBe(10);
        expect(item.discount_amount).toBe(20);
        expect(item.taxable_value).toBe(180);
        expect(item.igst_amount).toBe(32.4);
        expect(item.total).toBe(212.4);
    });

    it("collapses several PO mappings of one BOQ line into a single PDF row", () => {
        const boqBySrNo = new Map([[7, { itemDescription: "BOQ line", quantity: "10", rate: "100", gstRate: "18" }]]);
        const poDescriptionById = new Map<number, string | null>([[88, "PO A"], [99, "PO B"]]);
        const items = [
            pdfItem({ purchaseOrderProductId: 88, quantity: "1" }),
            pdfItem({ purchaseOrderProductId: 99, quantity: "3", srNo: 2 }),
        ];

        const [row] = aggregateSaleInvoiceItemsByBoq(items, boqBySrNo, poDescriptionById);

        expect(row.boqItemName).toBe("BOQ line");
        expect(row.poDescriptions).toEqual(["PO A", "PO B"]);
        expect(row.quantity).toBe(4);
        expect(row.boqQuantity).toBe("10");
        expect(row.rate).toBe(100);
        expect(row.amount).toBe(400);
    });

    it("bills the BOQ line and allocates it across the mapped PO rows", () => {
        const boqBySrNo = new Map([[7, { itemDescription: "BOQ line", quantity: "10", rate: "100", gstRate: "18" }]]);
        const poProductMap = new Map([
            [88, { rate: "50", unit: "EA", hsnSac: "1111" }],
            [99, { rate: "60", unit: "EA", hsnSac: "2222" }],
        ]);
        const rows = resolveSaleInvoiceItems(
            [
                { lineItemSrNo: 7, purchaseOrderProductId: 88, qty: 4, rate: 999, gstRate: 5, discountPercent: 10, itemDescription: "PO A" },
                { lineItemSrNo: 7, purchaseOrderProductId: 99, qty: 6, rate: 999, gstRate: 5, discountPercent: 10, itemDescription: "PO B" },
            ],
            boqBySrNo,
            poProductMap,
        );

        expect(rows.map(row => row.rate)).toEqual([100, 100]);
        expect(rows.map(row => row.gstRate)).toEqual([18, 18]);
        expect(rows.map(row => row.itemDescription)).toEqual(["BOQ line", "BOQ line"]);
        expect(rows.reduce((sum, row) => sum + row.grossAmount, 0)).toBe(1000);
        expect(rows.reduce((sum, row) => sum + row.discountAmount, 0)).toBe(100);
        expect(rows.reduce((sum, row) => sum + row.taxableAmount, 0)).toBe(900);
        expect(rows.reduce((sum, row) => sum + row.gstAmount, 0)).toBe(162);
        expect(rows[0].purchaseRate).toBe(50);
        expect(rows[0].purchaseAmount).toBe(200);
        expect(rows[1].purchaseRate).toBe(60);
        expect(rows[1].purchaseAmount).toBe(360);
    });

    it("keeps per-row pricing for projects without a BOQ", () => {
        const rows = resolveSaleInvoiceItems(
            [{ lineItemSrNo: 0, purchaseOrderProductId: 88, qty: 2, rate: 150, gstRate: 18, discountPercent: 0, itemDescription: "Free item" }],
            new Map(),
            new Map([[88, { rate: "100", unit: "EA", hsnSac: "1111" }]]),
        );

        expect(rows[0].rate).toBe(150);
        expect(rows[0].grossAmount).toBe(300);
        expect(rows[0].gstAmount).toBe(54);
        expect(rows[0].purchaseRate).toBe(100);
        expect(rows[0].purchaseAmount).toBe(200);
    });

    it("produces stable hashes for identical rendered data and new hashes for changed content", () => {
        const data = { invoice_number: "SI/TEST/0001", grand_total: 236 };

        expect(computeSaleInvoicePdfHash(data)).toBe(computeSaleInvoicePdfHash(data));
        expect(computeSaleInvoicePdfHash({ ...data, grand_total: 240 })).not.toBe(computeSaleInvoicePdfHash(data));
    });

    it.each([false, true])("renders the %s GST layout without sample constants", isInterstate => {
        const html = render(isInterstate);

        expect(html).toContain("<b>Test BOQ item</b>");
        expect(html).toContain("Test PO description");
        expect(html).toContain(">Qty<");
        expect(html).toContain(">Discount<");
        expect(html).toContain(">GST<");
        expect(html).toContain("HSN/SAC");
        expect(html).toContain("1234");
        if (isInterstate) {
            expect(html).toContain("IGST@18%");
        } else {
            expect(html).toContain("CGST@9%");
            expect(html).toContain("SGST@9%");
        }
        expect(html).toContain("Priya Manager");
        expect(html).toContain("Road");
        expect(html).toContain("Bengaluru");
        expect(html).toContain("Buyer Contact");
        expect(html).toContain("Consignee Contact");
        expect(html).toContain('colspan="11"');
        expect(html).toMatch(/<pre[^>]*>Buyer line one\nBuyer line two<\/pre>/);
        expect(html).toMatch(/<pre[^>]*>Consignee line one\nConsignee line two<\/pre>/);
        expect(html).toMatch(/<pre[^>]*>Dispatch line one\nDispatch line two<\/pre>/);
        expect(html).not.toMatch(/-0\.20|Plot 10\/1A/);
    });

    it("uses the PO description as the bold fallback when no BOQ match exists", () => {
        const html = render(true, "");

        expect(html).toContain("<b>Test PO description</b>");
    });

    it("builds the production PDF payload using billing GSTIN jurisdiction", async () => {
        const queryResults: unknown[][] = [
            [{ projectName: "Test Project", projectCode: "TP-1", poNo: "PO-123", poDate: "2026-10-20" }],
            [{ srNo: 7, itemDescription: "WO BOQ item", quantity: "10", rate: "100.00", gstRate: "18.00" }],
            [{ id: 88, description: "Live PO product description" }],
        ];
        const db = {
            select: () => ({
                from: () => ({
                    where: () => Promise.resolve(queryResults.shift() ?? []),
                }),
            }),
        };
        const generator = { grandTotalInWords: (value: number) => value.toString() };
        const service = new SaleInvoiceService(db as never, {} as never, generator as never);
        const invoice = {
            id: 1,
            invoiceNumber: "SI/TEST/0001",
            invoiceDate: "2026-10-23",
            woDetailId: 4,
            projectManagerName: "Priya Manager",
            projectManagerPhone: "9876543210",
            projectManagerEmail: "priya@example.com",
            billingCustomerName: "Buyer",
            billingAddress: "Unit 4, Industrial Estate",
            billingGst: "29ABCDE1234F1ZW",
            billingStateName: "Karnataka",
            billingPlaceOfSupply: "Bengaluru",
            billingContactPerson: "Buyer Contact",
            billingPhone: "9876500001",
            shippingStateName: "Tamil Nadu",
            shippingPlaceOfSupply: "Chennai",
            shippingContactPerson: "Consignee Contact",
            shippingPhone: "9876500002",
            transportVia: "Road",
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
        expect(data["buyer_order_number"]).toBe("PO-123");
        expect(data["buyer_order_date"]).toBe("2026-10-20");
        expect(data["buyer_address"]).toBe("Unit 4, Industrial Estate");
        expect(data["project_manager"]).toBe("Priya Manager");
        expect(data["project_manager_phone"]).toBe("9876543210");
        expect(data["buyer_state"]).toBe("Karnataka");
        expect(data["buyer_place_of_supply"]).toBe("Bengaluru");
        expect(data["buyer_contact_person"]).toBe("Buyer Contact");
        expect(data["consignee_state"]).toBe("Tamil Nadu");
        expect(data["consignee_place_of_supply"]).toBe("Chennai");
        expect(data["consignee_contact_person"]).toBe("Consignee Contact");
        expect(data["transporter_mode"]).toBe("Road");
        expect(rows[0].boq_item_name).toBe("WO BOQ item");
        expect(rows[0].po_item_description).toBe("Live PO product description");
        expect(rows[0].boq_quantity).toBe(10);
        expect(rows[0].quantity).toBe(2);
        expect(rows[0].igst_amount).toBe(36);
        expect(rows[0].cgst_amount).toBe(0);
    });

    it("rejects payload generation when billing GSTIN is missing or invalid", async () => {
        const service = new SaleInvoiceService({} as never, {} as never, {} as never);
        await expect(service["buildSiPdfData"]({ billingGst: "29ABCDE1234F1Z5" }, [])).rejects.toThrow("valid billing GSTIN");
    });
});
