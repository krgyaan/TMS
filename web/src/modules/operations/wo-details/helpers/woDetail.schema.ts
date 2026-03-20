import { z } from "zod";

// PAGE 1: PROJECT HANDOVER
export const ContactSchema = z.object({
  id: z.number().optional(),
  organization: z.string().max(100).optional(),
  departments: z.enum(["EIC", "User", "C&P", "Finance"]).optional(),
  name: z.string().min(1, "Name is required").max(255),
  designation: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  email: z.email().max(255).optional().or(z.literal("")),
});

export const TenderChecklistSchema = z.object({
  completeTenderDocuments: z.string().optional(),
  tenderInfo: z.string().optional(),
  emdInformation: z.string().optional(),
  physicalDocumentsSubmission: z.string().optional(),
  rfqAndQuotation: z.string().optional(),
  documentChecklist: z.string().optional(),
  costingSheet: z.string().optional(),
  result: z.string().optional(),
});

export const Page1FormSchema = z.object({
  contacts: z.array(ContactSchema).min(1, "At least one contact is required"),
  tenderDocumentsChecklist: TenderChecklistSchema,
});

// PAGE 2: COMPLIANCE OBLIGATIONS
export const Page2FormSchema = z
  .object({
    ldApplicable: z.string().optional(),
    maxLd: z.string().optional(),
    ldStartDate: z.string().optional(),
    maxLdDate: z.string().optional(),
    isPbgApplicable: z.string().optional(),
    filledBgFormat: z.string().max(255).optional(),
    pbgBgId: z.number().optional(),
    isContractAgreement: z.string().optional(),
    contractAgreementFormat: z.string().max(255).optional(),
    detailedPoApplicable: z.string().optional(),
    detailedPoFollowupId: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ldApplicable === 'true') {
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
          message: "LD Start Date is required",
          path: ["ldStartDate"],
        });
      }
      if (!data.maxLdDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Max LD Date is required",
          path: ["maxLdDate"],
        });
      }
    }

    if (data.isPbgApplicable === 'true' && !data.filledBgFormat && !data.pbgBgId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BG format or BG ID is required when PBG is applicable",
        path: ["filledBgFormat"],
      });
    }

    if (data.isContractAgreement === 'true' && !data.contractAgreementFormat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contract agreement format is required",
        path: ["contractAgreementFormat"],
      });
    }
  });

// PAGE 3: SWOT ANALYSIS
export const Page3FormSchema = z.object({
  swotStrengths: z.string().optional(),
  swotWeaknesses: z.string().optional(),
  swotOpportunities: z.string().optional(),
  swotThreats: z.string().optional(),
});

// PAGE 4: BILLING
export const BOQItemSchema = z.object({
  id: z.number().optional(),
  srNo: z.number().int().positive(),
  itemDescription: z.string().min(1, "Item description is required"),
  quantity: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid quantity"),
  rate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid rate"),
  amount: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const AddressSchema = z.object({
  id: z.number().optional(),
  srNos: z.union([
    z.array(z.number().int().positive()).min(1),
    z.literal("all"),
  ]),
  customerName: z.string().min(1, "Customer name is required").max(255),
  address: z.string().min(1, "Address is required"),
  gst: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST")
    .optional()
    .or(z.literal("")),
});

export const Page4FormSchema = z.object({
  billingBoq: z.array(BOQItemSchema).min(1, "At least one billing BOQ item is required"),
  buybackBoq: z.array(BOQItemSchema).optional().default([]),
  billingAddresses: z.array(AddressSchema).min(1, "At least one billing address is required"),
  shippingAddresses: z.array(AddressSchema).min(1, "At least one shipping address is required"),
});

// PAGE 5: PROJECT EXECUTION
export const SiteVisitPersonSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
});

export const Page5FormSchema = z
  .object({
    siteVisitNeeded: z.string().optional(),
    siteVisitPerson: SiteVisitPersonSchema.optional(),
    documentsFromTendering: z.array(z.string()).optional().default([]),
    documentsNeeded: z.array(z.string()).optional().default([]),
    documentsInHouse: z.array(z.string()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.siteVisitNeeded === 'true' && !data.siteVisitPerson?.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Site visit person details are required",
        path: ["siteVisitPerson", "name"],
      });
    }
  });

// PAGE 6: PROFITABILITY
export const Page6FormSchema = z
  .object({
    costingSheetLink: z.string().url().optional().or(z.literal("")),
    hasDiscrepancies: z.string().optional(),
    discrepancyComments: z.string().optional(),
    budgetPreGst: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
    budgetSupply: z.string().optional(),
    budgetService: z.string().optional(),
    budgetFreight: z.string().optional(),
    budgetAdmin: z.string().optional(),
    budgetBuybackSale: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasDiscrepancies === 'true' && !data.discrepancyComments?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Discrepancy comments are required",
        path: ["discrepancyComments"],
      });
    }
  });

// PAGE 7: WO ACCEPTANCE
export const AmendmentSchema = z.object({
  id: z.number().optional(),
  pageNo: z.string().max(100),
  clauseNo: z.string().max(100),
  currentStatement: z.string(),
  correctedStatement: z.string(),
});

export const Page7FormSchema = z
  .object({
    oeWoAmendmentNeeded: z.string().optional(),
    amendments: z.array(AmendmentSchema).optional().default([]),
    oeSignaturePrepared: z.string().optional(),
    courierRequestPrepared: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.oeWoAmendmentNeeded === 'true' && data.amendments.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one amendment is required",
        path: ["amendments"],
      });
    }

    if (data.oeWoAmendmentNeeded !== 'true') {
      if (data.oeSignaturePrepared !== 'true') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "OE signature must be prepared",
          path: ["oeSignaturePrepared"],
        });
      }
      if (data.courierRequestPrepared !== 'true') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Courier request must be prepared",
          path: ["courierRequestPrepared"],
        });
      }
    }
  });
