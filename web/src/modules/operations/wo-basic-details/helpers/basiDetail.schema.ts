import { z } from "zod";

export const WoBasicDetailFormSchema = z.object({
  tenderId: z.number().nullable().optional(),

  teamId: z.coerce.number().int().positive({ message: "Team is required" }).nullable().optional(),
  organizationId: z.coerce.number().nullable().optional(),
  itemId: z.coerce.number().nullable().optional(),
  locationId: z.coerce.number().nullable().optional(),

  woNumber: z.string().min(1, "WO Number is Required"),
  woDate: z.date().min(1, "WO Date is Required."),

  woValuePreGst: z.coerce.number().nonnegative().min(1, "WO Value (pre GST) is Required."),
  woValueGstAmt: z.coerce.number().nonnegative().min(1, "WO Value (GST) is Required."),

  budgetPreGst: z.coerce.number().nonnegative().optional(),
  receiptPreGst: z.coerce.number().nonnegative().optional(),
  grossMargin: z.coerce.number().nonnegative().optional(),
  finalPrice: z.coerce.number().nonnegative().optional(),
  pricesChanged: z.string().default("false"),

  budgetSupply: z.coerce.number().nonnegative().optional(),
  budgetService: z.coerce.number().nonnegative().optional(),
  budgetFreight: z.coerce.number().nonnegative().optional(),
  budgetAdmin: z.coerce.number().nonnegative().optional(),
  budgetBuybackSale: z.coerce.number().nonnegative().optional(),
  budgetGemCharges: z.coerce.number().nonnegative().optional(),

  requestGemCharges: z.string().default("false"),
  gemChargesAmount: z.coerce.number().nonnegative().optional(),
  gemChargesPortalLink: z.string().default(""),
  gemChargesInvoice: z.array(z.string()).default([]),

  projectCode: z.string().optional(),
  projectName: z.string().optional(),

  woDraft: z.array(z.string()).min(1, "Upload at least one file here."),
  teChecklistConfirmed: z.boolean().default(false),
  tmsDocuments: z.record(z.string(), z.boolean().optional()).default({}),
})
.superRefine((data, ctx) => {
  // GEM Charges conditional validation
  if (data.requestGemCharges === "true") {
    if (data.gemChargesAmount === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["gemChargesAmount"],
        message: "GEM Charges Amount is required.",
      });
    }

    if (!data.gemChargesPortalLink?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["gemChargesPortalLink"],
        message: "GEM Charges Portal Link is required.",
      });
    }
  }
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
