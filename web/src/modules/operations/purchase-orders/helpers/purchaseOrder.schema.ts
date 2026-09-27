import { z } from "zod";

const productItemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    qty: z.number().nullable().refine(v => v !== null && v > 0, "Qty must be greater than 0"),
    unit: z.string(),
    rate: z.number().nullable().refine(v => v !== null && v >= 0, "Rate is required"),
    gstRate: z.number(),
});

const termRowSchema = z.object({
    field: z.string().min(1, "Field is required"),
    value: z.string(),
});

export const purchaseOrderFormSchema = z.object({
    poType: z.enum(["new", "pi"]),
    piAttachments: z.array(z.string()),
    category: z.string().min(1, "Category is required"),
    poDate: z.string().min(1, "PO date is required"),

    sellerId: z.string(),
    sellerSource: z.enum(["", "vendor_org", "party"]),
    sellerName: z.string().min(1, "Seller name is required"),
    sellerEmail: z.string(),
    sellerAddress: z.string(),
    sellerGstNo: z.string(),
    sellerPanNo: z.string(),
    sellerMsmeNo: z.string(),
    sellerCinNo: z.string(),
    contactPersonName: z.string(),
    contactPersonPhone: z.string(),
    contactPersonEmail: z.string(),

    partyId: z.string(),
    selectedUserId: z.string().min(1, "Team member is required"),
    selectedCertRecipients: z.array(z.string()).min(1, "At least one certificate recipient is required"),
    shipToName: z.string().min(1, "Ship to name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shipToGst: z.string(),
    shipToPan: z.string(),

    products: z.array(productItemSchema).min(1, "At least one product is required"),

    quotationNo: z.string(),
    quotationDate: z.string(),
    termsAndConditions: z.array(termRowSchema),
    technicalSpecsAttachments: z.array(z.string()),
    accessoriesPackagingListAttachments: z.array(z.string()),
    remarks: z.string(),
    uploadInvoice: z.enum(["no", "yes"]),
    invoiceDate: z.string(),
    invoiceValue: z.number().nullable(),
    invoiceGst: z.number().nullable(),
    invoiceFile: z.array(z.string()),
}).superRefine((data, ctx) => {
    if (data.poType === "pi" && data.piAttachments.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["piAttachments"], message: "Invoice copy is required for PI-based PO" });
    }
    if (data.uploadInvoice === "yes") {
        if (!data.invoiceDate) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invoiceDate"], message: "Invoice date is required" });
        }
        if (data.invoiceValue == null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invoiceValue"], message: "Value is required" });
        }
        if (data.invoiceGst == null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invoiceGst"], message: "GST amount is required" });
        }
        if (data.invoiceFile.length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invoiceFile"], message: "Upload an invoice file" });
        }
    }
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
export type ProductFormItem = z.infer<typeof productItemSchema>;
export type TermFormItem = z.infer<typeof termRowSchema>;
