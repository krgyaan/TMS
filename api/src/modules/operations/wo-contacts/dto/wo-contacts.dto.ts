import { z } from "zod";

// ============================================
// WO CONTACTS SCHEMAS
// ============================================


export const DepartmentEnum = z.enum(["EIC", "User", "C&P", "Finance"]);

export type Department = z.infer<typeof DepartmentEnum>;

export const CreateWoContactSchema = z.object({
  woBasicDetailId: z.number().int().positive({
    message: "Valid WO Basic Detail ID is required",
  }),
  organization: z.string().max(255).optional(),
  departments: DepartmentEnum.optional(),
  name: z.string().min(1, "Name is required").max(255),
  designation: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  isFromTender: z.boolean().default(false).optional(),
});

export type CreateWoContactDto = z.infer<typeof CreateWoContactSchema>;

// ============================================
// BULK CREATE WO CONTACTS
// ============================================

export const CreateBulkWoContactsSchema = z.object({
  woBasicDetailId: z.number().int().positive({
    message: "Valid WO Basic Detail ID is required",
  }),
  contacts: z.array(
    z.object({
      organization: z.string().max(255).optional(),
      departments: DepartmentEnum.optional(),
      name: z.string().min(1, "Name is required").max(255),
      designation: z.string().max(100).optional(),
      phone: z.string().max(20).optional(),
      email: z.string().email().max(255).optional().or(z.literal("")),
      isFromTender: z.boolean().default(false).optional(),
    })
  ).min(1, "At least one contact is required"),
});

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
