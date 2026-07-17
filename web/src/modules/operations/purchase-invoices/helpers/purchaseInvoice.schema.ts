import { z } from "zod";

export const purchaseInvoiceFormSchema = z.object({
    category: z.string().min(1, "Category is required"),
    partyName: z.string().min(1, "Party name is required"),
    valuePreGst: z.number().nullable().refine(v => v !== null && v >= 0, "Value must be >= 0"),
    gstAmount: z.number().nullable().refine(v => v !== null && v >= 0, "GST amount must be >= 0"),
    invoiceDate: z.string().min(1, "Invoice date is required"),
    invoiceFile: z.array(z.string()).default([]),
    selectedPoId: z.string().default(""),
});

export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceFormSchema>;
