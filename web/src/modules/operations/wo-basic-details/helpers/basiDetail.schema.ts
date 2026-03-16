import { z } from "zod";

export const WoBasicDetailFormSchema = z.object({
  tenderId: z.number().nullable().optional(),

  woNumber: z.string().min(1, "WO Number is required"),
  woDate: z.date().nullable(),

  woValuePreGst: z.coerce.number().nonnegative().optional(),
  woValueGstAmt: z.coerce.number().nonnegative().optional(),

  budgetPreGst: z.coerce.number().nonnegative().optional(),
  receiptPreGst: z.coerce.number().nonnegative().optional(),
  grossMargin: z.coerce.number().nonnegative().optional(),

  projectCode: z.string().optional(),
  projectName: z.string().optional(),

  wo_draft: z.array(z.string()).optional().nullable(),
  teChecklistConfirmed: z.boolean().default(false),
  tmsDocuments: z.record(z.string(), z.boolean()).default({}),
});

