import { z } from 'zod';

// ENUMS
export const DocumentTypeEnum = z.enum([
  'draftWo',
  'acceptedWoSigned',
  'finalWo',
  'detailedWo',
  'sapPo',
  'foa',
]);

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

// CREATE
export const CreateWoDocumentSchema = z.object({
  woDetailId: z.number().int().positive(),
  type: DocumentTypeEnum,
  filePath: z.string().min(1, 'File path is required').max(500),
  version: z.number().int().positive().optional(),
});

export type CreateWoDocumentDto = z.infer<typeof CreateWoDocumentSchema>;

// UPDATE
export const UpdateWoDocumentSchema = z.object({
  type: DocumentTypeEnum.optional(),
  filePath: z.string().max(500).optional(),
  version: z.number().int().positive().optional(),
});

export type UpdateWoDocumentDto = z.infer<typeof UpdateWoDocumentSchema>;

// BULK CREATE
export const CreateBulkWoDocumentsSchema = z.object({
  woDetailId: z.number().int().positive(),
  documents: z.array(
    z.object({
      type: DocumentTypeEnum,
      filePath: z.string().min(1).max(500),
      version: z.number().int().positive().optional(),
    })
  ),
});

export type CreateBulkWoDocumentsDto = z.infer<typeof CreateBulkWoDocumentsSchema>;

// REPLACE
export const ReplaceDocumentSchema = z.object({
  filePath: z.string().min(1, 'File path is required').max(500),
  incrementVersion: z.boolean().default(true),
});

export type ReplaceDocumentDto = z.infer<typeof ReplaceDocumentSchema>;

// QUERY/FILTERS
export const WoDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50).optional(),
  sortBy: z
    .enum(['uploadedAt', 'version', 'type'])
    .default('uploadedAt')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),

  woDetailId: z.coerce.number().int().positive().optional(),
  type: DocumentTypeEnum.optional(),
  version: z.coerce.number().int().positive().optional(),
  uploadedFrom: z.string().datetime().optional(),
  uploadedTo: z.string().datetime().optional(),
});

export type WoDocumentsQueryDto = z.infer<typeof WoDocumentsQuerySchema>;
