import { z } from 'zod';
import {
    bigintField,
    jsonbField,
} from '@/utils/zod-schema-generator';

/**
 * Extra Document Schema - Based on extraDocuments JSONB field
 */
const ExtraDocumentSchema = z.object({
    name: z.string().optional(),
    path: z.string().optional(),
});

export type ExtraDocumentDto = z.infer<typeof ExtraDocumentSchema>;

/**
 * Create Document Checklist Schema - Based on tenderDocumentChecklists table
 */
export const CreateDocumentChecklistSchema = z.object({
    tenderId: bigintField().positive('Tender ID must be positive'),
    selectedDocuments: z.array(z.string()).optional(),
    extraDocuments: z.array(ExtraDocumentSchema).optional(),
});

export type CreateDocumentChecklistDto = z.infer<typeof CreateDocumentChecklistSchema>;

/**
 * Update Document Checklist Schema - Partial update
 */
export const UpdateDocumentChecklistSchema = z.object({
    selectedDocuments: z.array(z.string()).optional(),
    extraDocuments: z.array(ExtraDocumentSchema).optional(),
});

export type UpdateDocumentChecklistDto = z.infer<typeof UpdateDocumentChecklistSchema>;
