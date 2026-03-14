import { z } from "zod";

// ============================================
// WO CONTACTS SCHEMAS
// ============================================

/**
 * Schema for creating a new WO Contact
 */
export const CreateWoContactSchema = z.object({
  woBasicDetailId: z.number().int().positive({
    message: "Valid WO Basic Detail ID is required",
  }),

  // Client organization details
  organization: z.string().max(100).optional(),
  departments: z.enum(["EIC", "User", "C&P", "Finance"], {
    invalid_type_error: "Invalid department type",
  }).optional(),

  // Contact person details
  name: z.string().max(255).optional(),
  designation: z.string().max(50).optional(),
  phone: z
    .string()
    .max(20)
    .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format")
    .optional(),
  email: z.string().email("Invalid email format").max(255).optional(),
});

export type CreateWoContactDto = z.infer<typeof CreateWoContactSchema>;

/**
 * Schema for updating WO Contact
 */
export const UpdateWoContactSchema = CreateWoContactSchema.partial().omit({
  woBasicDetailId: true,
});

export type UpdateWoContactDto = z.infer<typeof UpdateWoContactSchema>;

/**
 * Schema for bulk contact creation
 */
export const CreateBulkWoContactsSchema = z.object({
  woBasicDetailId: z.number().int().positive(),
  contacts: z.array(
    z.object({
      organization: z.string().max(100).optional(),
      departments: z.enum(["EIC", "User", "C&P", "Finance"]).optional(),
      name: z.string().max(255).optional(),
      designation: z.string().max(50).optional(),
      phone: z
        .string()
        .max(20)
        .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format")
        .optional(),
      email: z.string().email().max(255).optional(),
    })
  ).min(1, "At least one contact is required"),
});

export type CreateBulkWoContactsDto = z.infer<typeof CreateBulkWoContactsSchema>;

/**
 * Schema for filtering/querying WO Contacts
 */
export const WoContactsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Filters
  woBasicDetailId: z.coerce.number().int().positive().optional(),
  organization: z.string().max(100).optional(),
  departments: z.enum(["EIC", "User", "C&P", "Finance"]).optional(),
  name: z.string().max(255).optional(),
  email: z.string().max(255).optional(),

  // Search
  search: z.string().max(255).optional(),

  // Sorting
  sortBy: z
    .enum(["name", "organization", "departments", "email"])
    .default("name")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
});

export type WoContactsQueryDto = z.infer<typeof WoContactsQuerySchema>;

/**
 * Schema for importing contacts from TMS tender
 */
export const ImportContactsFromTenderSchema = z.object({
  woBasicDetailId: z.number().int().positive(),
  tenderId: z.number().int().positive(),
});

export type ImportContactsFromTenderDto = z.infer<typeof ImportContactsFromTenderSchema>;
