import { z } from 'zod';

/**
 * Schema for document checklist form
 */
export const DocumentChecklistFormSchema = z.object({
    tenderId: z.number().min(1, 'Tender ID is required'),
    selectedDocuments: z.array(z.string()).optional(),
    extraDocuments: z.array(z.object({
        name: z.string().min(1, 'Document name is required'),
        path: z.string().optional(),
    })).optional(),
}).refine(
    (data) => {
        const hasSelectedDocuments = data.selectedDocuments && data.selectedDocuments.length > 0;
        const hasExtraDocuments = data.extraDocuments && data.extraDocuments.length > 0;
        return hasSelectedDocuments || hasExtraDocuments;
    },
    {
        message: 'At least one document (standard or additional) must be selected',
        path: ['selectedDocuments'],
    }
).superRefine((data, ctx) => {
    if (data.extraDocuments) {
        data.extraDocuments.forEach((doc, index) => {
            if (doc.name && doc.name.trim().length > 0 && (!doc.path || doc.path.trim().length === 0)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'File upload is required when document name is provided',
                    path: ['extraDocuments', index, 'path'],
                });
            }
        });
    }
});

export type DocumentChecklistFormValues = z.infer<typeof DocumentChecklistFormSchema>;
