import { z } from "zod";

export const createPurchaseInvoiceSchema = z.object({
    projectId: z.number(),
    category: z.string().min(1, "Category is required"),
    partyName: z.string().min(1, "Party name is required"),
    valuePreGst: z.number().min(0, "Value must be >= 0"),
    gstAmount: z.number().min(0, "GST amount must be >= 0"),
    invoiceDate: z.string().min(1, "Invoice date is required"),
    uploadedBy: z.number().optional(),
    invoiceFile: z.string().optional(),
});

export type CreatePurchaseInvoiceDto = z.infer<typeof createPurchaseInvoiceSchema>;
