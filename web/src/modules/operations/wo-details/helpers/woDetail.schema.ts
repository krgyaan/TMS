import { z } from "zod";

export const ContactSchema = z.object({
  id: z.number().optional(),
  organization: z.string().max(100).optional(),
  departments: z.enum(["EIC", "User", "C&P", "Finance"]).optional(),
  name: z.string().max(255).optional(),
  designation: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
});

export const TenderChecklistSchema = z.object({
  completeTenderDocuments: z.string().optional(),
  tenderInfo: z.string().optional(),
  emdInformation: z.string().optional(),
  physicalDocumentsSubmission: z.string().optional(),
  rfq: z.string().optional(),
  quotation: z.string().optional(),
  tqDocument: z.string().optional(),
  priceBreakup: z.string().optional(),
  documentChecklist: z.string().optional(),
  costingSheet: z.string().optional(),
  result: z.string().optional(),
});

export const Page1FormSchema = z.object({
  contacts: z.array(ContactSchema).optional().default([]),
  tenderDocumentsChecklist: TenderChecklistSchema.optional(),
});

export const Page2FormSchema = z.object({
  ldApplicable: z.string().optional(),
  maxLd: z.string().optional(),
  ldStartDate: z.string().optional(),
  maxLdDate: z.string().optional(),
  isPbgApplicable: z.string().optional(),
  filledBgFormat: z.array(z.string()),
  pbgBgId: z.number().optional(),
  isContractAgreement: z.string().optional(),
  contractAgreementFormat: z.array(z.string()),
  detailedPoApplicable: z.string().optional(),
  detailedPoFollowupId: z.number().optional(),
});

export const Page3FormSchema = z.object({
  swotStrengths: z.string().optional(),
  swotWeaknesses: z.string().optional(),
  swotOpportunities: z.string().optional(),
  swotThreats: z.string().optional(),
});

export const BOQItemSchema = z.object({
  id: z.number().optional(),
  srNo: z.number().int().positive().optional(),
  itemDescription: z.string().optional(),
  quantity: z.string().optional(),
  rate: z.string().optional(),
  amount: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const AddressSchema = z.object({
  id: z.number().optional(),
  srNos: z.union([
    z.array(z.number().int().positive()).min(1),
    z.literal("all"),
  ]).optional(),
  customerName: z.string().max(255).optional(),
  address: z.string().optional(),
  gst: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST")
    .optional()
    .or(z.literal("")),
});

export const Page4FormSchema = z.object({
  billingBoq: z.array(BOQItemSchema).optional().default([]),
  buybackBoq: z.array(BOQItemSchema).optional().default([]),
  buybackBoqApplicable: z.string().optional(),
  billingAddresses: z.array(AddressSchema).optional().default([]),
  shippingAddresses: z.array(AddressSchema).optional().default([]),
});

export const SiteVisitPersonSchema = z.object({
  name: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
});

export const Page5FormSchema = z.object({
  siteVisitNeeded: z.string().optional(),
  siteVisitPerson: SiteVisitPersonSchema.optional(),
  documentsFromTendering: z.array(z.string()).optional().default([]),
  documentsNeeded: z.array(z.string()).optional().default([]),
  documentsInHouse: z.array(z.string()).optional().default([]),
});

export const Page6FormSchema = z.object({
  costingSheetLink: z.string().optional().or(z.literal("")),
  hasDiscrepancies: z.string().optional(),
  discrepancyComments: z.string().optional(),
});

export const AmendmentSchema = z.object({
  id: z.number().optional(),
  pageNo: z.string().max(100).optional(),
  clauseNo: z.string().max(100).optional(),
  currentStatement: z.string().optional(),
  correctedStatement: z.string().optional(),
});

export const Page7FormSchema = z.object({
  oeWoAmendmentNeeded: z.string().optional(),
  amendments: z.array(AmendmentSchema).optional().default([]),
  oeSignaturePrepared: z.string().optional(),
  courierRequestPrepared: z.string().optional(),
});
