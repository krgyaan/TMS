import { z } from "zod";

// ============================================
// WO DOCUMENTS SCHEMAS
// ============================================

export const DocumentTypeEnum = z.enum([
  "draftWo",
  "acceptedWoSigned",
  "finalWo",
  "detailedWo",
  "sapPo",
  "foa",
]);

/**
 * Schema for uploading WO Document
 */
export const CreateWoDocumentSchema = z.object({
  woDetailId: z.number().int().positive({
    message: "Valid WO Detail ID is required",
  }),

  type: DocumentTypeEnum,
  version: z.number().int().positive().optional(), // Auto-incremented if not provided
  filePath: z.string().max(500).min(1, "File path is required"),
  uploadedAt: z.string().datetime().optional(), // Auto-filled
});

export type CreateWoDocumentDto = z.infer<typeof CreateWoDocumentSchema>;

/**
 * Schema for updating WO Document
 */
export const UpdateWoDocumentSchema = z.object({
  version: z.number().int().positive().optional(),
  filePath: z.string().max(500).optional(),
});

export type UpdateWoDocumentDto = z.infer<typeof UpdateWoDocumentSchema>;

/**
 * Schema for bulk document upload
 */
export const CreateBulkWoDocumentsSchema = z.object({
  woDetailId: z.number().int().positive(),
  documents: z.array(
    z.object({
      type: DocumentTypeEnum,
      version: z.number().int().positive().optional(),
      filePath: z.string().max(500).min(1),
    })
  ).min(1, "At least one document is required"),
});

export type CreateBulkWoDocumentsDto = z.infer<typeof CreateBulkWoDocumentsSchema>;

/**
 * Schema for filtering/querying WO Documents
 */
export const WoDocumentsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Filters
  woDetailId: z.coerce.number().int().positive().optional(),
  type: DocumentTypeEnum.optional(),
  version: z.coerce.number().int().positive().optional(),

  // Date filters
  uploadedFrom: z.string().datetime().optional(),
  uploadedTo: z.string().datetime().optional(),

  // Sorting
  sortBy: z
    .enum(["uploadedAt", "version", "type"])
    .default("uploadedAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type WoDocumentsQueryDto = z.infer<typeof WoDocumentsQuerySchema>;

/**
 * Schema for replacing document (upload new version)
 */
export const ReplaceDocumentSchema = z.object({
  filePath: z.string().max(500).min(1, "File path is required"),
  incrementVersion: z.boolean().default(true),
});

export type ReplaceDocumentDto = z.infer<typeof ReplaceDocumentSchema>;
