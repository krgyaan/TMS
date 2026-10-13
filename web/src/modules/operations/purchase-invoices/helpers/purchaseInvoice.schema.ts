import { z } from "zod";

export const invoiceItemFormSchema = z.object({
    description: z.string().min(1, "Description is required"),
    hsnSac: z.string().default(""),
    qty: z
        .number()
        .nullable()
        .refine(v => v == null || v > 0, "Quantity must be > 0")
        .default(null),
    unit: z.string().default(""),
    rate: z
        .number()
        .nullable()
        .refine(v => v == null || v > 0, "Rate must be > 0")
        .default(null),
    gstRate: z.number().min(0).max(100).default(18),
});

export const extraChargeFormSchema = z.object({
    label: z.string().min(1, "Charge label is required"),
    amount: z
        .number()
        .nullable()
        .refine(v => v == null || v > 0, "Charge amount must be > 0")
        .default(null),
    gstRate: z.number().min(0).max(100).default(18),
});

export const purchaseInvoiceFormSchema = z.object({
    invoiceNo: z.string().min(1, "Invoice number is required"),
    category: z.string().min(1, "Category is required"),
    partyName: z.string().min(1, "Party name is required"),
    valuePreGst: z
        .number()
        .nullable()
        .refine(v => v !== null && v >= 0, "Value must be >= 0"),
    gstAmount: z
        .number()
        .nullable()
        .refine(v => v !== null && v >= 0, "GST amount must be >= 0"),
    invoiceDate: z.string().min(1, "Invoice date is required"),
    invoiceFile: z.array(z.string()).default([]),
    selectedPoId: z.string().default(""),
    selectedVwoId: z.string().default(""),
    items: z.array(invoiceItemFormSchema).default([]),
    extraCharges: z.array(extraChargeFormSchema).default([]),
});

export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceFormSchema>;
export type InvoiceItemFormValues = z.infer<typeof invoiceItemFormSchema>;
export type ExtraChargeFormValues = z.infer<typeof extraChargeFormSchema>;

export const EXTRA_CHARGE_PRESETS = [
    { id: "Freight", name: "Freight" },
    { id: "Security", name: "Security" },
] as const;

export const GST_RATES = [0, 5, 12, 18, 28] as const;
