import { z } from "zod";
// PAGE 3: SWOT ANALYSIS

/**
 * Save Page 3 data (all fields optional)
 */
export const SavePage3Schema = z.object({
  swotStrengths: z.string().nullable().optional(),
  swotWeaknesses: z.string().nullable().optional(),
  swotOpportunities: z.string().nullable().optional(),
  swotThreats: z.string().nullable().optional(),
});

export type SavePage3Dto = z.infer<typeof SavePage3Schema>;

/**
 * Submit Page 3 (all fields still optional as per requirements)
 */
export const SubmitPage3Schema = SavePage3Schema;

export type SubmitPage3Dto = z.infer<typeof SubmitPage3Schema>;

/**
 * Page 3 response
 */
export const Page3ResponseSchema = z.object({
  swotStrengths: z.string().nullable(),
  swotWeaknesses: z.string().nullable(),
  swotOpportunities: z.string().nullable(),
  swotThreats: z.string().nullable(),
  swotCompletedAt: z.string().nullable(),
  hasContent: z.boolean(),
});

export type Page3ResponseDto = z.infer<typeof Page3ResponseSchema>;
