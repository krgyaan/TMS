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

  woDraft: z.array(z.string()).optional().nullable(),
  teChecklistConfirmed: z.boolean().default(false),
  tmsDocuments: z.record(z.string(), z.boolean()).default({}),
});

export const AssignOeFormSchema = z.object({
  woBasicDetailId: z.number().optional(),
  oeFirst: z.number().nullable().optional(),
  oeFirstAssignedAt: z.date().nullable().optional(),
  oeFirstAssignedBy: z.number().nullable().optional(),
  oeSiteVisit: z.number().nullable().optional(),
  oeSiteVisitAssignedAt: z.date().nullable().optional(),
  oeSiteVisitAssignedBy: z.number().nullable().optional(),
  oeDocsPrep: z.number().nullable().optional(),
  oeDocsPrepAssignedAt: z.date().nullable().optional(),
  oeDocsPrepAssignedBy: z.number().nullable().optional(),
});
