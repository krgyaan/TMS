import { z } from 'zod';
import { textField } from '@/utils/zod-schema-generator';

export const CreateFinanceDocumentSchema = z.object({
    documentName: textField(255).min(1, 'Document Name is required'),
    documentType: z.coerce.number().int().positive('Document Type is required'),
    financialYear: z.coerce.number().int().positive('Financial Year is required'),
    uploadFile: z.array(z.string()).optional(),
});

export type CreateFinanceDocumentDto = z.infer<typeof CreateFinanceDocumentSchema>;

export const UpdateFinanceDocumentSchema = CreateFinanceDocumentSchema.partial();

export type UpdateFinanceDocumentDto = z.infer<typeof UpdateFinanceDocumentSchema>;
