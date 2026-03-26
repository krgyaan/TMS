import { z } from "zod";
import { TenderDocumentsChecklistSchema, PositiveIntSchema } from "./wo-details.dto";
// PAGE 1: PROJECT HANDOVER
/**
 * Department Enum
 */
export const DepartmentEnum = z.enum(["EIC", "User", "C&P", "Finance"]);
export type Department = z.infer<typeof DepartmentEnum>;

/**
 * Contact input for Page 1
 * Contacts are saved to woContacts table with woBasicDetailId
 */
export const Page1ContactSchema = z.object({
  id: PositiveIntSchema.optional(),
  organization: z.string().max(100).nullable().optional(),
  departments: DepartmentEnum.nullable().optional(),
  name: z.string().max(255).nullable().optional(),
  designation: z.string().max(50).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal("")),
});

export type Page1ContactDto = z.infer<typeof Page1ContactSchema>;

/**
 * Save Page 1 data (all optional for drafts)
 */
export const SavePage1Schema = z.object({
  contacts: z.array(Page1ContactSchema).optional(),
  tenderDocumentsChecklist: TenderDocumentsChecklistSchema.optional(),
});

export type SavePage1Dto = z.infer<typeof SavePage1Schema>;

/**
 * Submit Page 1 (validates required fields)
 */
export const SubmitPage1Schema = z.object({
  contacts: z
    .array(
      Page1ContactSchema.extend({
        name: z.string().min(1, "Name is required").max(255),
      })
    )
    .min(1, "At least one contact is required"),
  tenderDocumentsChecklist: TenderDocumentsChecklistSchema,
});

export type SubmitPage1Dto = z.infer<typeof SubmitPage1Schema>;

/**
 * Page 1 response
 */
export const Page1ResponseSchema = z.object({
  contacts: z.array(
    Page1ContactSchema.extend({
      id: z.number(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  tenderDocumentsChecklist: TenderDocumentsChecklistSchema.nullable(),
  checklistCompletedAt: z.string().nullable(),
  checklistIncompleteNotifiedAt: z.string().nullable(),
  isChecklistComplete: z.boolean(),
  incompleteItems: z.array(z.string()),
});

export type Page1ResponseDto = z.infer<typeof Page1ResponseSchema>;
