import { z } from 'zod';

const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid decimal format. Use up to 2 decimal places')
  .or(z.number().transform(val => val.toString()));

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
  .or(z.date().transform(val => val.toISOString().split('T')[0]));

const phoneNumber = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must not exceed 20 characters')
  .regex(/^[+]?[\d\s-]+$/, 'Invalid phone number format');

const emailAddress = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal(''));

const filePathOrUrl = z
  .string()
  .max(500, 'File path/URL must not exceed 500 characters')
  .optional()
  .nullable();


/**
 * Create Loan Advance DTO
 */
export const createLoanAdvanceSchema = z.object({
  // Basic loan details
  loanPartyName: z.string().min(1, 'Loan Party Name is Required'),
  bankName: z
    .string()
    .min(1, 'Bank/NBFC name is required')
    .max(255, 'Bank name must not exceed 255 characters'),
  loanAccNo: z
    .string()
    .min(1, 'Loan account number is required')
    .max(100, 'Loan account number must not exceed 100 characters'),
  typeOfLoan: z.string().min(1, 'Loan Type is required'),
  loanAmount: decimalString,

  // Dates
  sanctionLetterDate: dateString,
  emiPaymentDate: dateString,
  lastEmiDate: dateString.optional().nullable(),

  // Document uploads
  sanctionLetter: filePathOrUrl,
  bankLoanSchedule: filePathOrUrl,
  loanSchedule: z.string().max(2000).optional().nullable(), // Google Sheet Link

  // Boolean/Enum flags
  chargeMcaWebsite: z.string().default('No'),
  tdsToBeDeductedOnInterest: z.string().default('No'),

  // Initial values for computed fields
  principleOutstanding: decimalString.optional()
});

/**
 * Update Loan Advance DTO
 */
export const updateLoanAdvanceSchema = z.object({
  loanPartyName: z.string().optional(),
  bankName: z.string().min(1).max(255).optional(),
  loanAccNo: z.string().min(1).max(100).optional(),
  typeOfLoan: z.string().optional(),
  loanAmount: decimalString.optional(),
  sanctionLetterDate: dateString.optional(),
  emiPaymentDate: dateString.optional(),
  lastEmiDate: dateString.optional().nullable(),
  sanctionLetter: filePathOrUrl,
  bankLoanSchedule: filePathOrUrl,
  loanSchedule: z.string().max(2000).optional().nullable(),
  chargeMcaWebsite: z.string().optional(),
  tdsToBeDeductedOnInterest: z.string().optional()
}).partial();

/**
 * Loan Closure DTO
 */
export const loanClosureSchema = z.object({
  bankNocDocument: z
    .string()
    .min(1, 'Bank NOC document is required')
    .max(500),
  closureCreatedMca: filePathOrUrl
}).refine(
  (data) => true, // Additional validation can be added based on chargeMcaWebsite
  { message: 'Closure MCA document is required if charge was created on MCA website' }
);

/**
 * Loan Advance Response DTO
 */
export const loanAdvanceResponseSchema = z.object({
  id: z.number(),
  loanPartyName: z.string(),
  bankName: z.string(),
  loanAccNo: z.string(),
  typeOfLoan: z.string(),
  loanAmount: z.string(),
  sanctionLetterDate: z.string(),
  emiPaymentDate: z.string(),
  lastEmiDate: z.string().nullable(),
  sanctionLetter: z.string().nullable(),
  bankLoanSchedule: z.string().nullable(),
  loanSchedule: z.string().nullable(),
  chargeMcaWebsite: z.string(),
  tdsToBeDeductedOnInterest: z.string(),
  loanCloseStatus: z.string(),
  closureCreatedMca: z.string().nullable(),
  bankNocDocument: z.string().nullable(),
  principleOutstanding: z.string().nullable(),
  totalInterestPaid: z.string().nullable(),
  totalPenalChargesPaid: z.string().nullable(),
  totalTdsToRecover: z.string().nullable(),
  noOfEmisPaid: z.number().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string())
});

/**
 * Create Bank Contact DTO
 */
export const createLoanBankContactSchema = z.object({
  loanId: z.number().int().positive('Loan ID is required'),
  orgName: z
    .string()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name must not exceed 255 characters'),
  personName: z
    .string()
    .min(1, 'Person name is required')
    .max(255, 'Person name must not exceed 255 characters'),
  designation: z
    .string()
    .max(255, 'Designation must not exceed 255 characters')
    .optional()
    .nullable(),
  phone: phoneNumber,
  email: emailAddress.nullable()
});

/**
 * Update Bank Contact DTO
 */
export const updateLoanBankContactSchema = createLoanBankContactSchema.omit({ loanId: true }).partial();

/**
 * Bank Contact Response DTO
 */
export const loanBankContactResponseSchema = z.object({
  id: z.number(),
  loanId: z.number(),
  orgName: z.string(),
  personName: z.string(),
  designation: z.string().nullable(),
  phone: z.string(),
  email: z.string().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string())
});

/**
 * Bulk Create Bank Contacts DTO
 */
export const bulkCreateLoanBankContactsSchema = z.object({
  loanId: z.number().int().positive(),
  contacts: z.array(
    createLoanBankContactSchema.omit({ loanId: true })
  ).min(1, 'At least one contact is required')
});

/**
 * Create Due EMI DTO (EMI Payment Form)
 */
const dueEmiBaseSchema = z.object({
  loanId: z.number().int().positive('Loan ID is required'),
  emiDate: dateString,
  principlePaid: decimalString,
  interestPaid: decimalString,
  tdsToBeRecovered: decimalString.default('0'),
  penalChargesPaid: decimalString.default('0')
});

export const createDueEmiSchema = dueEmiBaseSchema.refine(
  (data) => {
    const principle = parseFloat(data.principlePaid as string) || 0;
    const interest = parseFloat(data.interestPaid as string) || 0;
    return principle > 0 || interest > 0;
  },
  { message: 'Either principle or interest paid must be greater than 0' }
);

export const updateDueEmiSchema = dueEmiBaseSchema.omit({ loanId: true }).partial();

/**
 * Due EMI Response DTO
 */
export const dueEmiResponseSchema = z.object({
  id: z.number(),
  loanId: z.number(),
  emiDate: z.string(),
  principlePaid: z.string(),
  interestPaid: z.string(),
  tdsToBeRecovered: z.string(),
  penalChargesPaid: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string())
});

/**
 * Due EMI List Query DTO
 */
export const dueEmiQuerySchema = z.object({
  loanId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  sortBy: z.enum(['emiDate', 'createdAt']).default('emiDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * Create TDS Followup DTO
 */
export const createTdsFollowupSchema = z.object({
  loanId: z.number().int().positive('Loan ID is required'),
  totalTdsToRecover: decimalString,
  form16Document: filePathOrUrl,
  otherDocument: filePathOrUrl,
  otherDocumentName: z
    .string()
    .max(255, 'Document name must not exceed 255 characters')
    .optional()
    .nullable(),
  remarks: z.string().max(2000).optional().nullable()
});

/**
 * Update TDS Followup DTO
 */
export const updateTdsFollowupSchema = createTdsFollowupSchema
  .omit({ loanId: true })
  .partial();

/**
 * TDS Followup Response DTO
 */
export const tdsFollowupResponseSchema = z.object({
  id: z.number(),
  loanId: z.number(),
  totalTdsToRecover: z.string(),
  form16Document: z.string().nullable(),
  otherDocument: z.string().nullable(),
  otherDocumentName: z.string().nullable(),
  remarks: z.string().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string())
});

/**
 * Create TDS Recovery DTO
 */
export const createTdsRecoverySchema = z.object({
  loanId: z.number().int().positive('Loan ID is required'),
  tdsAmount: decimalString.refine(
    (val) => parseFloat(val as string) > 0,
    { message: 'TDS amount must be greater than 0' }
  ),
  tdsDocument: filePathOrUrl,
  tdsDate: dateString,
  tdsRecoveryBankDetails: z
    .string()
    .max(2000, 'Bank details must not exceed 2000 characters')
    .optional()
    .nullable()
});

/**
 * Update TDS Recovery DTO
 */
export const updateTdsRecoverySchema = createTdsRecoverySchema
  .omit({ loanId: true })
  .partial();

/**
 * TDS Recovery Response DTO
 */
export const tdsRecoveryResponseSchema = z.object({
  id: z.number(),
  loanId: z.number(),
  tdsAmount: z.string(),
  tdsDocument: z.string().nullable(),
  tdsDate: z.string(),
  tdsRecoveryBankDetails: z.string().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string())
});

/**
 * Loan Dashboard Item DTO (for listing)
 */
export const loanDashboardItemSchema = z.object({
  id: z.number(),
  loanPartyName: z.string(),
  bankName: z.string(),
  loanAccNo: z.string(),
  loanAmount: z.string(),
  sanctionLetterDate: z.string(),
  emiPaymentDate: z.string(),
  lastEmiDate: z.string().nullable(),
  noOfEmisPaid: z.number().nullable(),
  totalInterestPaid: z.string().nullable(),
  totalPenalChargesPaid: z.string().nullable(),
  principleOutstanding: z.string().nullable(),
  totalTdsToRecover: z.string().nullable(),
  loanCloseStatus: z.string(),
  chargeMcaWebsite: z.string(),
  isDue: z.boolean(), // Computed: true if emiPaymentDate < today
  showNocUpload: z.boolean() // Computed: true if loan closure date reached
});

/**
 * Loan Full Details DTO (with all relations)
 */
export const loanFullDetailsSchema = loanAdvanceResponseSchema.extend({
  bankContacts: z.array(loanBankContactResponseSchema),
  dueEmis: z.array(dueEmiResponseSchema),
  tdsFollowups: z.array(tdsFollowupResponseSchema),
  tdsRecoveries: z.array(tdsRecoveryResponseSchema)
});

/**
 * TDS Recovery Followup Combined DTO
 */
export const tdsRecoveryFollowupSchema = z.object({
  loanId: z.number(),
  bankContacts: z.array(loanBankContactResponseSchema),
  totalTdsToRecover: z.string(),
  followups: z.array(tdsFollowupResponseSchema),
  recoveries: z.array(tdsRecoveryResponseSchema),
  remainingTdsToRecover: z.string() // Computed: totalTdsToRecover - sum(recoveries)
});

// ===================== TYPE EXPORTS =====================

// Loan Advances
export type CreateLoanAdvanceDto = z.infer<typeof createLoanAdvanceSchema>;
export type UpdateLoanAdvanceDto = z.infer<typeof updateLoanAdvanceSchema>;
export type LoanClosureDto = z.infer<typeof loanClosureSchema>;
export type LoanAdvanceResponse = z.infer<typeof loanAdvanceResponseSchema>;
export type LoanDashboardItem = z.infer<typeof loanDashboardItemSchema>;
export type LoanFullDetails = z.infer<typeof loanFullDetailsSchema>;

// Bank Contacts
export type CreateLoanBankContactDto = z.infer<typeof createLoanBankContactSchema>;
export type UpdateLoanBankContactDto = z.infer<typeof updateLoanBankContactSchema>;
export type BulkCreateLoanBankContactsDto = z.infer<typeof bulkCreateLoanBankContactsSchema>;
export type LoanBankContactResponse = z.infer<typeof loanBankContactResponseSchema>;

// Due EMIs
export type CreateDueEmiDto = z.infer<typeof createDueEmiSchema>;
export type UpdateDueEmiDto = z.infer<typeof updateDueEmiSchema>;
export type DueEmiResponse = z.infer<typeof dueEmiResponseSchema>;
export type DueEmiQuery = z.infer<typeof dueEmiQuerySchema>;

// TDS Followups
export type CreateTdsFollowupDto = z.infer<typeof createTdsFollowupSchema>;
export type UpdateTdsFollowupDto = z.infer<typeof updateTdsFollowupSchema>;
export type TdsFollowupResponse = z.infer<typeof tdsFollowupResponseSchema>;

// TDS Recoveries
export type CreateTdsRecoveryDto = z.infer<typeof createTdsRecoverySchema>;
export type UpdateTdsRecoveryDto = z.infer<typeof updateTdsRecoverySchema>;
export type TdsRecoveryResponse = z.infer<typeof tdsRecoveryResponseSchema>;
export type TdsRecoveryFollowup = z.infer<typeof tdsRecoveryFollowupSchema>;
