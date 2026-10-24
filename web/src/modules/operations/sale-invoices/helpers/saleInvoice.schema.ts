import { z } from "zod";

const saleInvoiceItemSchema = z.object({
    lineItemSrNo: z.number().int(),
    purchaseOrderProductId: z.number().int().positive(),
    itemDescription: z.string().min(1, "Description is required"),
    qty: z.number().nullable().refine((v) => v !== null && v > 0, "Qty must be greater than 0"),
    rate: z.number().nullable().refine((v) => v !== null && v >= 0, "Rate is required"),
    gstRate: z.coerce.number().default(18),
    unit: z.string().optional(),
    hsnSac: z.string().optional(),
});

export const saleInvoiceFormSchema = z
    .object({
        invoiceDate: z.string().min(1, "Invoice date is required"),

        selectedLineSrNos: z
            .array(z.number().int())
            .min(1, "Select at least one WO Billing BOQ line item"),
        items: z.array(saleInvoiceItemSchema).min(1, "Map at least one PO item to a line item"),

        selectedBillingAddressId: z.string().default(""),
        billingCustomerName: z.string().min(1, "Billing customer name is required"),
        billingAddress: z.string().min(1, "Billing address is required"),
        billingGst: z.string().default(""),
        billingEmail: z.string().default(""),
        billingPanNo: z.string().default(""),
        billingMsmeNo: z.string().default(""),
        billingCinNo: z.string().default(""),

        selectedShippingAddressId: z.string().default(""),
        shippingCustomerName: z.string().min(1, "Shipping customer name is required"),
        shippingAddress: z.string().min(1, "Shipping address is required"),
        shippingGst: z.string().default(""),
        shippingPanNo: z.string().default(""),

        transporterId: z.string().default(""),

        dispatchFromName: z.string().default(""),
        dispatchFromAddress: z.string().default(""),
        dispatchFromGst: z.string().default(""),
        dispatchVehicleNo: z.string().default(""),
        dispatchLrNo: z.string().default(""),
        dispatchToName: z.string().default(""),
        dispatchToAddress: z.string().default(""),
        dispatchToGst: z.string().default(""),

        freight: z.number().nullable().default(0),
        otherCharges: z.number().nullable().default(0),
        roundOff: z.number().nullable().default(0),

        remarks: z.string().default(""),
    })
    .superRefine((values, ctx) => {
        const selected = new Set(values.selectedLineSrNos);
        const mappedCounts = new Map<number, number>();
        const seenProducts = new Set<number>();

        values.items.forEach((item, index) => {
            mappedCounts.set(item.lineItemSrNo, (mappedCounts.get(item.lineItemSrNo) ?? 0) + 1);
            if (seenProducts.has(item.purchaseOrderProductId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["items", index, "purchaseOrderProductId"],
                    message: "This PO item is already mapped — remove the duplicate",
                });
            }
            seenProducts.add(item.purchaseOrderProductId);
            if (!selected.has(item.lineItemSrNo)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["items", index, "lineItemSrNo"],
                    message: `Line item ${item.lineItemSrNo} is not selected`,
                });
            }
        });

        const unmapped = values.selectedLineSrNos.filter((srNo) => !mappedCounts.get(srNo));
        if (unmapped.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["selectedLineSrNos"],
                message: `Line item${unmapped.length > 1 ? "s" : ""} ${unmapped.join(", ")} need${unmapped.length > 1 ? "" : "s"} at least one mapped PO item`,
            });
        }
    });

export type SaleInvoiceFormValues = z.infer<typeof saleInvoiceFormSchema>;
export type SaleInvoiceItemForm = z.infer<typeof saleInvoiceItemSchema>;

export const stepOneFields = ["selectedLineSrNos", "items"] as const;
export const stepTwoFields = [
    "invoiceDate",
    "billingCustomerName",
    "billingAddress",
    "shippingCustomerName",
    "shippingAddress",
] as const;
export const stepThreeFields = ["freight", "otherCharges", "roundOff"] as const;
