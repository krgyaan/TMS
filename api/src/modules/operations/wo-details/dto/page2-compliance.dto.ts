import { z } from "zod";
import { PercentageSchema, PositiveIntSchema } from "./wo-details.dto";
// PAGE 2: COMPLIANCE OBLIGATIONS
/**
 * Save Page 2 data (all fields optional for drafts)
 */
export const SavePage2Schema = z.object({
  ldApplicable: z.boolean().optional(),
  maxLd: PercentageSchema.nullable().optional(),
  ldStartDate: z.string().date().nullable().optional(),
  maxLdDate: z.string().date().nullable().optional(),

  isPbgApplicable: z.boolean().optional(),
  filledBgFormat: z.string().max(255).nullable().optional(),
  pbgBgId: PositiveIntSchema.nullable().optional(),

  isContractAgreement: z.boolean().optional(),
  contractAgreementFormat: z.string().max(255).nullable().optional(),

  detailedPoApplicable: z.boolean().optional(),
  detailedPoFollowupId: PositiveIntSchema.nullable().optional(),
});

export type SavePage2Dto = z.infer<typeof SavePage2Schema>;

/**
 * Submit Page 2 (validates conditional requirements)
 */
export const SubmitPage2Schema = z
  .object({
    ldApplicable: z.boolean(),
    maxLd: PercentageSchema.nullable().optional(),
    ldStartDate: z.string().date().nullable().optional(),
    maxLdDate: z.string().date().nullable().optional(),

    isPbgApplicable: z.boolean(),
    filledBgFormat: z.string().max(255).nullable().optional(),
    pbgBgId: PositiveIntSchema.nullable().optional(),

    isContractAgreement: z.boolean(),
    contractAgreementFormat: z.string().max(255).nullable().optional(),

    detailedPoApplicable: z.boolean(),
    detailedPoFollowupId: PositiveIntSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate LD fields
    if (data.ldApplicable) {
      if (!data.maxLd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Max LD% is required when LD is applicable",
          path: ["maxLd"],
        });
      }
      if (!data.ldStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "LD Start Date is required when LD is applicable",
          path: ["ldStartDate"],
        });
      }
      if (!data.maxLdDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Max LD Date is required when LD is applicable",
          path: ["maxLdDate"],
        });
      }
    }

    // Validate PBG fields
    if (data.isPbgApplicable && !data.filledBgFormat && !data.pbgBgId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either BG format or BG ID is required when PBG is applicable",
        path: ["filledBgFormat"],
      });
    }

    // Validate Contract Agreement
    if (data.isContractAgreement && !data.contractAgreementFormat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contract agreement format is required",
        path: ["contractAgreementFormat"],
      });
    }
  });

export type SubmitPage2Dto = z.infer<typeof SubmitPage2Schema>;

/**
 * Page 2 response
 */
export const Page2ResponseSchema = z.object({
  ldApplicable: z.boolean(),
  maxLd: z.string().nullable(),
  ldStartDate: z.string().nullable(),
  maxLdDate: z.string().nullable(),

  isPbgApplicable: z.boolean(),
  filledBgFormat: z.string().nullable(),
  pbgBgId: z.number().nullable(),

  isContractAgreement: z.boolean(),
  contractAgreementFormat: z.string().nullable(),

  detailedPoApplicable: z.boolean(),
  detailedPoFollowupId: z.number().nullable(),
});

export type Page2ResponseDto = z.infer<typeof Page2ResponseSchema>;
