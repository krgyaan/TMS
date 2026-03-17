import { z } from "zod";
import { DecimalSchema } from "./wo-details.dto";

// ============================================
// PAGE 6: ACTUAL PROJECT PROFITABILITY
// ============================================

/**
 * Budget Breakdown Schema
 */
export const BudgetBreakdownSchema = z.object({
  supply: DecimalSchema.nullable().optional(),
  service: DecimalSchema.nullable().optional(),
  freight: DecimalSchema.nullable().optional(),
  admin: DecimalSchema.nullable().optional(),
  buybackSale: DecimalSchema.nullable().optional(),
});

export type BudgetBreakdownDto = z.infer<typeof BudgetBreakdownSchema>;

/**
 * Save Page 6 data (all optional for drafts)
 */
export const SavePage6Schema = z.object({
  costingSheetLink: z
    .string()
    .url()
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("")),
  hasDiscrepancies: z.boolean().optional(),
  discrepancyComments: z.string().nullable().optional(),
  budgetPreGst: DecimalSchema.nullable().optional(),
  budgetBreakdown: BudgetBreakdownSchema.optional(),
});

export type SavePage6Dto = z.infer<typeof SavePage6Schema>;

/**
 * Submit Page 6 (validates conditional requirements)
 */
export const SubmitPage6Schema = z
  .object({
    costingSheetLink: z
      .string()
      .url()
      .max(500)
      .nullable()
      .optional()
      .or(z.literal("")),
    hasDiscrepancies: z.boolean(),
    discrepancyComments: z.string().nullable().optional(),
    budgetPreGst: DecimalSchema,
    budgetBreakdown: BudgetBreakdownSchema,
  })
  .superRefine((data, ctx) => {
    if (
      data.hasDiscrepancies &&
      (!data.discrepancyComments || data.discrepancyComments.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Discrepancy comments are required when discrepancies exist",
        path: ["discrepancyComments"],
      });
    }
  });

export type SubmitPage6Dto = z.infer<typeof SubmitPage6Schema>;

/**
 * Page 6 response
 */
export const Page6ResponseSchema = z.object({
  costingSheetLink: z.string().nullable(),
  hasDiscrepancies: z.boolean(),
  discrepancyComments: z.string().nullable(),
  discrepancyNotifiedAt: z.string().nullable(),
  budgetPreGst: z.string().nullable(),
  budgetSupply: z.string().nullable(),
  budgetService: z.string().nullable(),
  budgetFreight: z.string().nullable(),
  budgetAdmin: z.string().nullable(),
  budgetBuybackSale: z.string().nullable(),
  totalBudget: z.string(),
});

export type Page6ResponseDto = z.infer<typeof Page6ResponseSchema>;
