import { z } from "zod";

const productItemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    qty: z.number().nullable().refine(v => v !== null && v > 0, "Qty must be greater than 0"),
    unit: z.string().default("NOS"),
    rate: z.number().nullable().refine(v => v !== null && v >= 0, "Rate is required"),
    gstRate: z.number().default(18),
});

const termRowSchema = z.object({
    field: z.string().min(1, "Field is required"),
    value: z.string().default(""),
});

export const purchaseOrderFormSchema = z.object({
    poType: z.enum(["new", "pi"]).default("new"),
    piAttachments: z.array(z.string()).default([]),
    category: z.string().min(1, "Category is required"),
    poDate: z.string().min(1, "PO date is required"),

    sellerId: z.string().default(""),
    sellerName: z.string().min(1, "Seller name is required"),
    sellerEmail: z.string().default(""),
    sellerAddress: z.string().default(""),
    sellerGstNo: z.string().default(""),
    sellerPanNo: z.string().default(""),
    sellerMsmeNo: z.string().default(""),
    sellerCinNo: z.string().default(""),
    contactPersonName: z.string().default(""),
    contactPersonPhone: z.string().default(""),
    contactPersonEmail: z.string().default(""),

    partyId: z.string().default(""),
    selectedUserId: z.string().min(1, "Team member is required"),
    selectedCertRecipients: z.array(z.string()).min(1, "At least one certificate recipient is required").default([]),
    shipToName: z.string().min(1, "Ship to name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shipToGst: z.string().default(""),
    shipToPan: z.string().default(""),

    products: z.array(productItemSchema).min(1, "At least one product is required"),

    quotationNo: z.string().default(""),
    quotationDate: z.string().default(""),
    termsAndConditions: z.array(termRowSchema).default([]),
    technicalSpecsAttachments: z.array(z.string()).default([]),
    accessoriesPackagingListAttachments: z.array(z.string()).default([]),
    remarks: z.string().default(""),
    uploadInvoice: z.enum(["no", "yes"]).default("no"),
    invoiceDate: z.string().default(""),
    invoiceValue: z.number().nullable().default(null),
    invoiceGst: z.number().nullable().default(null),
    invoiceFile: z.array(z.string()).default([]),
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
