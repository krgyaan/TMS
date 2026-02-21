import { z } from 'zod';

export const FinanceDocumentFormSchema = z.object({
    documentName: z.string().min(1, { message: "Document Name is required" }),
    documentType: z.coerce.number().int().positive({ message: "Document Type is required" }),
    financialYear: z.coerce.number().int().positive({ message: "Financial Year is required" }),
    uploadFile: z.array(z.string()).default([]),
});

export type FinanceDocumentFormValues = z.infer<typeof FinanceDocumentFormSchema>;
