import { z } from "zod";
import { SiteVisitPersonSchema } from "./wo-details.dto";
// PAGE 5: PROJECT EXECUTION
/**
 * Site Visit Person Input Schema (with validation)
 */
export const SiteVisitPersonInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().max(20).optional().default(""),
  email: z.string().email().max(255).optional().or(z.literal("")).default(""),
});

export type SiteVisitPersonInputDto = z.infer<typeof SiteVisitPersonInputSchema>;

/**
 * Save Page 5 data (all optional for drafts)
 */
export const SavePage5Schema = z.object({
  siteVisitNeeded: z.boolean().optional(),
  siteVisitPerson: SiteVisitPersonInputSchema.nullable().optional(),
  documentsFromTendering: z.array(z.string().max(500)).nullable().optional(),
  documentsNeeded: z.array(z.string().max(500)).nullable().optional(),
  documentsInHouse: z.array(z.string().max(500)).nullable().optional(),
});

export type SavePage5Dto = z.infer<typeof SavePage5Schema>;

/**
 * Submit Page 5 (validates conditional requirements)
 */
export const SubmitPage5Schema = z
  .object({
    siteVisitNeeded: z.boolean(),
    siteVisitPerson: SiteVisitPersonInputSchema.nullable().optional(),
    documentsFromTendering: z.array(z.string().max(500)).nullable().optional(),
    documentsNeeded: z.array(z.string().max(500)).nullable().optional(),
    documentsInHouse: z.array(z.string().max(500)).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.siteVisitNeeded && !data.siteVisitPerson) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Site visit person details are required when site visit is needed",
        path: ["siteVisitPerson"],
      });
    }
  });

export type SubmitPage5Dto = z.infer<typeof SubmitPage5Schema>;

/**
 * Page 5 response
 */
export const Page5ResponseSchema = z.object({
  siteVisitNeeded: z.boolean(),
  siteVisitPerson: SiteVisitPersonSchema.nullable(),
  documentsFromTendering: z.array(z.string()).nullable(),
  documentsNeeded: z.array(z.string()).nullable(),
  documentsInHouse: z.array(z.string()).nullable(),
  totalDocuments: z.number(),
});

export type Page5ResponseDto = z.infer<typeof Page5ResponseSchema>;
