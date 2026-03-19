import { z } from 'zod';

export const DecimalSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format")
  .or(z.number().transform(String));

export const PercentageSchema = z
  .string()
  .regex(/^(100(\.00?)?|\d{1,2}(\.\d{1,2})?)$/, "Invalid percentage (0-100)")
  .or(z.number().min(0).max(100).transform(String));

export const PositiveIntSchema = z.number().int().positive();


// ENUMS
export const WoDetailsStatusEnum = z.enum([
  'draft', 'in_progress', 'completed', 'submitted_for_review'
]);

export const WoAcceptanceStatusEnum = z.enum([
  'pending_review', 'in_review', 'queries_pending', 'awaiting_amendment', 'pending_signatures', 'pending_courier', 'completed'
]);

export const WoDetailsListResponseSchema = z.object({
  id: z.number().int().positive(),
  woBasicDetailId: z.number().int().positive(),
  projectName: z.string().max(255),
  woNumber: z.string().max(255),
  woDate: z.string().date(),
  woValuePreGst: DecimalSchema,
  woValueGstAmt: DecimalSchema,
  ldApplicable: z.boolean(),
  isContractAgreement: z.boolean(),
  oeWoAmendmentNeeded: z.boolean(),
  status: WoDetailsStatusEnum,
  woAcceptanceId: z.number().int().positive().nullable(),
  woAcceptanceStatus: WoAcceptanceStatusEnum.nullable(),
});

export type WoDetailsListResponseDto = z.infer<typeof WoDetailsListResponseSchema>;

export type WoDetailsStatus = z.infer<typeof WoDetailsStatusEnum>;

// COMMON SCHEMAS
export const TenderDocumentsChecklistSchema = z.object({
  completeTenderDocuments: z.boolean().default(false),
  tenderInfo: z.boolean().default(false),
  emdInformation: z.boolean().default(false),
  physicalDocumentsSubmission: z.boolean().default(false),
  rfqAndQuotation: z.boolean().default(false),
  documentChecklist: z.boolean().default(false),
  costingSheet: z.boolean().default(false),
  result: z.boolean().default(false),
});

export type TenderDocumentsChecklist = z.infer<typeof TenderDocumentsChecklistSchema>;

export const SiteVisitPersonSchema = z.object({
  name: z.string().max(255),
  phone: z.string().max(20).default(''),
  email: z.string().max(255).default(''),
});

export type SiteVisitPerson = z.infer<typeof SiteVisitPersonSchema>;

// CREATE
export const CreateWoDetailSchema = z.object({
  woBasicDetailId: z.number().int().positive(),
});

export type CreateWoDetailDto = z.infer<typeof CreateWoDetailSchema>;

// UPDATE (Full)
export const UpdateWoDetailSchema = z.object({
  // Page 1: Project Handover
  tenderDocumentsChecklist: TenderDocumentsChecklistSchema.optional(),

  // Page 2: Compliance Obligations
  ldApplicable: z.boolean().optional(),
  maxLd: PercentageSchema.nullable().optional(),
  ldStartDate: z.string().date().nullable().optional(),
  maxLdDate: z.string().date().nullable().optional(),
  isPbgApplicable: z.boolean().optional(),
  filledBgFormat: z.string().max(255).nullable().optional(),
  pbgBgId: z.number().int().positive().nullable().optional(),
  isContractAgreement: z.boolean().optional(),
  contractAgreementFormat: z.string().max(255).nullable().optional(),
  detailedPoApplicable: z.boolean().optional(),
  detailedPoFollowupId: z.number().int().positive().nullable().optional(),

  // Page 3: SWOT Analysis
  swotStrengths: z.string().nullable().optional(),
  swotWeaknesses: z.string().nullable().optional(),
  swotOpportunities: z.string().nullable().optional(),
  swotThreats: z.string().nullable().optional(),

  // Page 5: Project Execution
  siteVisitNeeded: z.boolean().optional(),
  siteVisitPerson: SiteVisitPersonSchema.nullable().optional(),
  documentsFromTendering: z.array(z.string()).nullable().optional(),
  documentsNeeded: z.array(z.string()).nullable().optional(),
  documentsInHouse: z.array(z.string()).nullable().optional(),

  // Page 6: Profitability
  costingSheetLink: z.string().url().max(500).nullable().optional().or(z.literal('')),
  hasDiscrepancies: z.boolean().optional(),
  discrepancyComments: z.string().nullable().optional(),
  budgetPreGst: DecimalSchema.nullable().optional(),
  budgetSupply: DecimalSchema.nullable().optional(),
  budgetService: DecimalSchema.nullable().optional(),
  budgetFreight: DecimalSchema.nullable().optional(),
  budgetAdmin: DecimalSchema.nullable().optional(),
  budgetBuybackSale: DecimalSchema.nullable().optional(),

  // Page 7: WO Acceptance (OE Step)
  oeWoAmendmentNeeded: z.boolean().optional(),
  oeSignaturePrepared: z.boolean().optional(),
  courierRequestPrepared: z.boolean().optional(),

  // Wizard Progress
  currentPage: z.number().int().min(1).max(7).optional(),
  status: WoDetailsStatusEnum.optional(),
});

export type UpdateWoDetailDto = z.infer<typeof UpdateWoDetailSchema>;

// QUERY/FILTERS
export const WoDetailsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'currentPage', 'status', 'woNumber', 'woDate', 'projectName', 'woValuePreGst', 'woValueGstAmt'])
    .default('createdAt')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),

  search: z.string().optional(),
  woBasicDetailId: z.coerce.number().int().positive().optional(),
  status: WoDetailsStatusEnum.optional(),
  ldApplicable: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  isPbgApplicable: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  isContractAgreement: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  siteVisitNeeded: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  hasDiscrepancies: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  createdBy: z.coerce.number().int().positive().optional(),
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),
  teamId: z.coerce.number().int().positive().optional(),
  woAcceptance: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  woAmendmentNeeded: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
});

export type WoDetailsQueryDto = z.infer<typeof WoDetailsQuerySchema>;

// PAGE-SPECIFIC SCHEMAS (Save/Submit)

// Page 1
export const SavePage1Schema = z.object({
  tenderDocumentsChecklist: TenderDocumentsChecklistSchema.optional(),
});

export const SubmitPage1Schema = z.object({
  tenderDocumentsChecklist: TenderDocumentsChecklistSchema,
});

export type SavePage1Dto = z.infer<typeof SavePage1Schema>;
export type SubmitPage1Dto = z.infer<typeof SubmitPage1Schema>;

// Page 2
export const SavePage2Schema = z.object({
  ldApplicable: z.boolean().optional(),
  maxLd: PercentageSchema.nullable().optional(),
  ldStartDate: z.string().date().nullable().optional(),
  maxLdDate: z.string().date().nullable().optional(),
  isPbgApplicable: z.boolean().optional(),
  filledBgFormat: z.string().max(255).nullable().optional(),
  pbgBgId: z.number().int().positive().nullable().optional(),
  isContractAgreement: z.boolean().optional(),
  contractAgreementFormat: z.string().max(255).nullable().optional(),
  detailedPoApplicable: z.boolean().optional(),
  detailedPoFollowupId: z.number().int().positive().nullable().optional(),
});

export const SubmitPage2Schema = z
  .object({
    ldApplicable: z.boolean(),
    maxLd: PercentageSchema.nullable().optional(),
    ldStartDate: z.string().date().nullable().optional(),
    maxLdDate: z.string().date().nullable().optional(),
    isPbgApplicable: z.boolean(),
    filledBgFormat: z.string().max(255).nullable().optional(),
    pbgBgId: z.number().int().positive().nullable().optional(),
    isContractAgreement: z.boolean(),
    contractAgreementFormat: z.string().max(255).nullable().optional(),
    detailedPoApplicable: z.boolean(),
    detailedPoFollowupId: z.number().int().positive().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ldApplicable) {
      if (!data.maxLd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Max LD% is required when LD is applicable',
          path: ['maxLd'],
        });
      }
      if (!data.ldStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'LD Start Date is required when LD is applicable',
          path: ['ldStartDate'],
        });
      }
      if (!data.maxLdDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Max LD Date is required when LD is applicable',
          path: ['maxLdDate'],
        });
      }
    }

    if (data.isPbgApplicable && !data.filledBgFormat && !data.pbgBgId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'BG format or BG ID is required when PBG is applicable',
        path: ['filledBgFormat'],
      });
    }

    if (data.isContractAgreement && !data.contractAgreementFormat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contract agreement format is required',
        path: ['contractAgreementFormat'],
      });
    }
  });

export type SavePage2Dto = z.infer<typeof SavePage2Schema>;
export type SubmitPage2Dto = z.infer<typeof SubmitPage2Schema>;

// Page 3
export const SavePage3Schema = z.object({
  swotStrengths: z.string().nullable().optional(),
  swotWeaknesses: z.string().nullable().optional(),
  swotOpportunities: z.string().nullable().optional(),
  swotThreats: z.string().nullable().optional(),
});

export const SubmitPage3Schema = SavePage3Schema;

export type SavePage3Dto = z.infer<typeof SavePage3Schema>;
export type SubmitPage3Dto = z.infer<typeof SubmitPage3Schema>;

// Page 4 - BOQ Items
export const BOQItemSchema = z.object({
  id: z.number().int().positive().optional(),
  srNo: z.number().int().positive(),
  itemDescription: z.string().min(1, 'Item description is required'),
  quantity: DecimalSchema,
  rate: DecimalSchema,
  sortOrder: z.number().int().optional(),
});

export const AddressSchema = z.object({
  id: z.number().int().positive().optional(),
  srNos: z.union([
    z.array(z.number().int().positive()).min(1),
    z.literal('all'),
  ]),
  customerName: z.string().min(1, 'Customer name is required').max(255),
  address: z.string().min(1, 'Address is required'),
  gst: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST')
    .nullable()
    .optional()
    .or(z.literal('')),
});

export const SavePage4Schema = z.object({
  billingBoq: z.array(BOQItemSchema).optional(),
  buybackBoq: z.array(BOQItemSchema).optional(),
  billingAddresses: z.array(AddressSchema).optional(),
  shippingAddresses: z.array(AddressSchema).optional(),
});

export const SubmitPage4Schema = z.object({
  billingBoq: z.array(BOQItemSchema).min(1, 'At least one billing BOQ item is required'),
  buybackBoq: z.array(BOQItemSchema).optional().default([]),
  billingAddresses: z.array(AddressSchema).min(1, 'At least one billing address is required'),
  shippingAddresses: z.array(AddressSchema).min(1, 'At least one shipping address is required'),
});

export type SavePage4Dto = z.infer<typeof SavePage4Schema>;
export type SubmitPage4Dto = z.infer<typeof SubmitPage4Schema>;
export type BOQItemDto = z.infer<typeof BOQItemSchema>;
export type AddressDto = z.infer<typeof AddressSchema>;

// Page 5
export const SavePage5Schema = z.object({
  siteVisitNeeded: z.boolean().optional(),
  siteVisitPerson: SiteVisitPersonSchema.nullable().optional(),
  documentsFromTendering: z.array(z.string()).nullable().optional(),
  documentsNeeded: z.array(z.string()).nullable().optional(),
  documentsInHouse: z.array(z.string()).nullable().optional(),
});

export const SubmitPage5Schema = z
  .object({
    siteVisitNeeded: z.boolean(),
    siteVisitPerson: SiteVisitPersonSchema.nullable().optional(),
    documentsFromTendering: z.array(z.string()).nullable().optional(),
    documentsNeeded: z.array(z.string()).nullable().optional(),
    documentsInHouse: z.array(z.string()).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.siteVisitNeeded && !data.siteVisitPerson?.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Site visit person details are required',
        path: ['siteVisitPerson'],
      });
    }
  });

export type SavePage5Dto = z.infer<typeof SavePage5Schema>;
export type SubmitPage5Dto = z.infer<typeof SubmitPage5Schema>;

// Page 6
export const SavePage6Schema = z.object({
  costingSheetLink: z.string().url().max(500).nullable().optional().or(z.literal('')),
  hasDiscrepancies: z.boolean().optional(),
  discrepancyComments: z.string().nullable().optional(),
  budgetPreGst: DecimalSchema.nullable().optional(),
  budgetSupply: DecimalSchema.nullable().optional(),
  budgetService: DecimalSchema.nullable().optional(),
  budgetFreight: DecimalSchema.nullable().optional(),
  budgetAdmin: DecimalSchema.nullable().optional(),
  budgetBuybackSale: DecimalSchema.nullable().optional(),
});

export const SubmitPage6Schema = z
  .object({
    costingSheetLink: z.string().url().max(500).nullable().optional().or(z.literal('')),
    hasDiscrepancies: z.boolean(),
    discrepancyComments: z.string().nullable().optional(),
    budgetPreGst: DecimalSchema,
    budgetSupply: DecimalSchema.nullable().optional(),
    budgetService: DecimalSchema.nullable().optional(),
    budgetFreight: DecimalSchema.nullable().optional(),
    budgetAdmin: DecimalSchema.nullable().optional(),
    budgetBuybackSale: DecimalSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasDiscrepancies && !data.discrepancyComments?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Discrepancy comments are required when discrepancies exist',
        path: ['discrepancyComments'],
      });
    }
  });

export type SavePage6Dto = z.infer<typeof SavePage6Schema>;
export type SubmitPage6Dto = z.infer<typeof SubmitPage6Schema>;

// Page 7
export const SavePage7Schema = z.object({
  oeWoAmendmentNeeded: z.boolean().optional(),
  oeSignaturePrepared: z.boolean().optional(),
  courierRequestPrepared: z.boolean().optional(),
});

export const SubmitPage7Schema = z
  .object({
    oeWoAmendmentNeeded: z.boolean(),
    oeSignaturePrepared: z.boolean(),
    courierRequestPrepared: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.oeWoAmendmentNeeded) {
      if (data.oeSignaturePrepared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cannot prepare signature while amendments are needed',
          path: ['oeSignaturePrepared'],
        });
      }
      if (data.courierRequestPrepared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cannot prepare courier while amendments are needed',
          path: ['courierRequestPrepared'],
        });
      }
    }

    if (!data.oeWoAmendmentNeeded) {
      if (!data.oeSignaturePrepared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'OE signature must be prepared',
          path: ['oeSignaturePrepared'],
        });
      }
      if (!data.courierRequestPrepared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Courier request must be prepared',
          path: ['courierRequestPrepared'],
        });
      }
    }
  });

export type SavePage7Dto = z.infer<typeof SavePage7Schema>;
export type SubmitPage7Dto = z.infer<typeof SubmitPage7Schema>;

// Skip Page
export const SkipPageSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type SkipPageDto = z.infer<typeof SkipPageSchema>;

// Page Schema Maps
export const PageSaveSchemas = {
  1: SavePage1Schema,
  2: SavePage2Schema,
  3: SavePage3Schema,
  4: SavePage4Schema,
  5: SavePage5Schema,
  6: SavePage6Schema,
  7: SavePage7Schema,
} as const;

export const PageSubmitSchemas = {
  1: SubmitPage1Schema,
  2: SubmitPage2Schema,
  3: SubmitPage3Schema,
  4: SubmitPage4Schema,
  5: SubmitPage5Schema,
  6: SubmitPage6Schema,
  7: SubmitPage7Schema,
} as const;
