import { z } from 'zod';

const nullishString = z.string().nullable().optional();
const nullishDate = z.string().nullable().optional();

export const CommonInstrumentFields = z.object({
  id: z.number(),
  requestId: z.number(),
  instrumentType: z.string(),
  purpose: nullishString,
  amount: z.string(),
  favouring: nullishString,
  payableAt: nullishString,
  courierAddress: nullishString,
  courierDeadline: z.number().nullable().optional(),
  status: z.string(),
  isActive: z.boolean(),
});

export const DdDetailsResponse = z.object({
  ddNo: nullishString,
  ddDate: nullishDate,
  reqNo: nullishString,
  ddNeeds: nullishString,
  ddPurpose: nullishString,
  ddRemarks: nullishString,
  courierAddress: nullishString,
  courierDeadline: nullishString,
}).nullable();

export const FdrDetailsResponse = z.object({
  fdrNo: nullishString,
  fdrDate: nullishDate,
  fdrSource: nullishString,
  fdrPurpose: nullishString,
  fdrExpiryDate: nullishDate,
  fdrNeeds: nullishString,
  fdrRemark: nullishString,
  reqNo: nullishString,
  courierAddress: nullishString,
  courierDeadline: nullishString,
}).nullable();

export const BgDetailsResponse = z.object({
  bgNo: nullishString,
  bgDate: nullishDate,
  validityDate: nullishDate,
  claimExpiryDate: nullishDate,
  beneficiaryName: nullishString,
  beneficiaryAddress: nullishString,
  bankName: nullishString,
  bgNeeds: nullishString,
  bgPurpose: nullishString,
}).nullable();

export const ChequeDetailsResponse = z.object({
  chequeNo: nullishString,
  chequeDate: nullishDate,
  bankName: nullishString,
  chequeNeeds: nullishString,
  chequeReason: nullishString,
}).nullable();

export const TransferDetailsResponse = z.object({
  utrNum: nullishString,
  transactionDate: nullishDate,
  accountName: nullishString,
  accountNumber: nullishString,
  ifsc: nullishString,
  reason: nullishString,
  remarks: nullishString,
  portalName: nullishString,
  portalNetBanking: nullishString,
  portalDebitCard: nullishString,
}).nullable();

export const InstrumentDdResponse = CommonInstrumentFields.extend({
  instrumentType: z.literal('DD'),
  details: DdDetailsResponse,
});

export const InstrumentFdrResponse = CommonInstrumentFields.extend({
  instrumentType: z.literal('FDR'),
  details: FdrDetailsResponse,
});

export const InstrumentBgResponse = CommonInstrumentFields.extend({
  instrumentType: z.literal('BG'),
  details: BgDetailsResponse,
});

export const InstrumentChequeResponse = CommonInstrumentFields.extend({
  instrumentType: z.literal('Cheque'),
  details: ChequeDetailsResponse,
});

export const InstrumentTransferResponse = CommonInstrumentFields.extend({
  instrumentType: z.literal('Bank Transfer'),
  details: TransferDetailsResponse,
});

export const InstrumentPortalResponse = CommonInstrumentFields.extend({
  instrumentType: z.literal('Portal Payment'),
  details: TransferDetailsResponse,
});

export const PaymentRequestResponse = z.object({
  id: z.number(),
  tenderId: z.number(),
  type: z.string(),
  tenderNo: z.string(),
  projectName: nullishString,
  dueDate: nullishDate,
  requestedBy: z.number().nullable(),
  requestedByName: nullishString,
  purpose: z.string(),
  amountRequired: z.string(),
  status: z.string(),
  remarks: nullishString,
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const TenderBasicResponse = z.object({
  id: z.number(),
  tenderNo: z.string(),
  tenderName: z.string(),
  team: z.number(),
  organization: z.number().nullable(),
  item: z.number(),
  gstValues: z.string(),
  tenderFees: z.string(),
  emd: z.string(),
  teamMember: z.number().nullable(),
  dueDate: z.string().nullable(),
  status: z.number(),
  location: z.number().nullable(),
  website: z.number().nullable(),
  emdMode: nullishString,
  tenderFeeMode: nullishString,
  processingFeeMode: nullishString,
  deleteStatus: z.number(),
});

export const InstrumentResponseSchema = z.discriminatedUnion('instrumentType', [
  InstrumentDdResponse,
  InstrumentFdrResponse,
  InstrumentBgResponse,
  InstrumentChequeResponse,
  InstrumentTransferResponse,
  InstrumentPortalResponse,
]);

export type InstrumentResponse = z.infer<typeof InstrumentDdResponse> | z.infer<typeof InstrumentFdrResponse> | z.infer<typeof InstrumentBgResponse> | z.infer<typeof InstrumentChequeResponse> | z.infer<typeof InstrumentTransferResponse> | z.infer<typeof InstrumentPortalResponse>;

export type PaymentRequestResponseType = z.infer<typeof PaymentRequestResponse>;
export type TenderBasicResponseType = z.infer<typeof TenderBasicResponse>;

export const FindByTenderResponse = z.object({
  tender: TenderBasicResponse,
  requests: z.array(PaymentRequestResponse.extend({
    instruments: z.array(InstrumentResponseSchema),
  })),
});

export const FindByIdResponse = z.object({
  id: z.number(),
  tenderId: z.number(),
  type: z.string(),
  tenderNo: z.string(),
  projectName: nullishString,
  dueDate: nullishDate,
  requestedBy: z.number().nullable(),
  requestedByName: nullishString,
  purpose: z.string(),
  amountRequired: z.string(),
  status: z.string(),
  remarks: nullishString,
  createdAt: z.string().nullable(),
  tender: TenderBasicResponse,
  instruments: z.array(InstrumentResponseSchema),
});

export type FindByTenderResponseType = z.infer<typeof FindByTenderResponse>;
export type FindByIdResponseType = z.infer<typeof FindByIdResponse>;

// ============================================================================
// Edit Page Optimized Response (Flattened)
// ============================================================================

export const PaymentRequestEditResponse = z.object({
  id: z.number(),
  tenderId: z.number(),
  tenderNo: z.string(),
  tenderName: z.string(),
  tenderDueDate: nullishDate,
  requestedBy: nullishString,
  purpose: z.string(), // EMD, Tender Fee, etc.
  mode: z.string().optional(), // DD, PORTAL, etc.
  
  // Flattened Instrument Details (Aligned with Frontend Keys)
  // DD
  ddFavouring: nullishString,
  ddPayableAt: nullishString,
  ddDeliverBy: nullishString,
  ddPurpose: nullishString,
  ddAmount: nullishString,
  ddCourierAddress: nullishString,
  ddCourierHours: z.number().nullable().optional(),
  ddDate: nullishDate,
  ddRemarks: nullishString,

  // FDR
  fdrFavouring: nullishString,
  fdrAmount: nullishString,
  fdrExpiryDate: nullishDate,
  fdrDeliverBy: nullishString,
  fdrPurpose: nullishString,
  fdrCourierAddress: nullishString,
  fdrCourierHours: z.number().nullable().optional(),
  fdrDate: nullishDate,

  // BG
  bgNeededIn: nullishString,
  bgAmount: nullishString,
  bgPurpose: nullishString,
  bgFavouring: nullishString,
  bgAddress: nullishString,
  bgExpiryDate: nullishDate,
  bgClaimPeriod: nullishDate,
  bgStampValue: z.number().nullable().optional(),
  bgFormatFiles: z.array(z.string()).optional(),
  bgPoFiles: z.array(z.string()).optional(),
  bgClientUserEmail: nullishString,
  bgClientCpEmail: nullishString,
  bgClientFinanceEmail: nullishString,
  bgBankAccountName: nullishString,
  bgBankAccountNo: nullishString,
  bgBankIfsc: nullishString,
  bgCourierAddress: nullishString,
  bgCourierDays: z.number().nullable().optional(),
  bgBank: nullishString,

  // Bank Transfer
  btPurpose: nullishString,
  btAmount: nullishString,
  btAccountName: nullishString,
  btAccountNo: nullishString,
  btIfsc: nullishString,

  // Portal Payment
  portalPurpose: nullishString,
  portalAmount: nullishString,
  portalName: nullishString,
  portalNetBanking: z.string().nullable().optional(), // YES/NO
  portalDebitCard: z.string().nullable().optional(), // YES/NO

  // Cheque
  chequeFavouring: nullishString,
  chequeAmount: nullishString,
  chequeDate: nullishDate,
  chequeNeededIn: nullishString,
  chequePurpose: nullishString,
  chequeAccount: nullishString,
});

export type PaymentRequestEditResponseType = z.infer<typeof PaymentRequestEditResponse>;