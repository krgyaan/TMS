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
    woBasicDetailId: z.number().int().positive(),
    oeFirst: z.union([
        z.number().int().positive(),
        z.string().transform(val => val ? parseInt(val, 10) : null),
    ]).nullable().optional(),
    oeFirstAssignedAt: z.coerce.date().nullable().optional(),
    oeFirstAssignedBy: z.number().int().positive().nullable().optional(),
    oeSiteVisit: z.union([
        z.number().int().positive(),
        z.string().transform(val => val ? parseInt(val, 10) : null),
    ]).nullable().optional(),
    oeSiteVisitAssignedAt: z.coerce.date().nullable().optional(),
    oeSiteVisitAssignedBy: z.number().int().positive().nullable().optional(),
    oeDocsPrep: z.union([
        z.number().int().positive(),
        z.string().transform(val => val ? parseInt(val, 10) : null),
    ]).nullable().optional(),
    oeDocsPrepAssignedAt: z.coerce.date().nullable().optional(),
    oeDocsPrepAssignedBy: z.number().int().positive().nullable().optional(),
});
