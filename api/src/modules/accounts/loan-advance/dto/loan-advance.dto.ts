import { z } from 'zod';

// ===================== COMMON VALIDATORS =====================

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

// Helper for file arrays - accepts array, normalizes empty to null
const fileArray = z
  .array(z.string().max(500))
  .nullish()
  .transform((val) => {
    if (!val || val.length === 0) return null;
    // Normalize backslashes to forward slashes
    return val.map(path => path.replace(/\\/g, '/'));
  });

// ===================== LOAN ADVANCES DTOs =====================

export const createLoanAdvanceSchema = z.object({
  loanPartyName: z.string().min(1, 'Loan Party Name is required'),
  bankName: z.string().min(1, 'Bank/NBFC name is required').max(255),
  loanAccNo: z.string().min(1, 'Loan account number is required').max(100),
  typeOfLoan: z.string().min(1, 'Loan Tyle is required'),
  loanAmount: decimalString,
  sanctionLetterDate: dateString,
  emiPaymentDate: dateString,
  lastEmiDate: dateString.optional().nullable(),
  sanctionLetter: fileArray,
  bankLoanSchedule: fileArray,
  loanSchedule: z.string().max(2000).optional().nullable(),
  chargeMcaWebsite: z.string().default('No'),
  tdsToBeDeductedOnInterest: z.string().default('No'),
  principleOutstanding: decimalString.optional(),
});

export const updateLoanAdvanceSchema = createLoanAdvanceSchema.partial();

export const loanClosureSchema = z.object({
  bankNocDocument: fileArray,
  closureCreatedMca: fileArray,
});

export const loanAdvanceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  loanPartyName: z.string().optional(),
  typeOfLoan: z.string().optional(),
  loanCloseStatus: z.string().optional(),
  sortBy: z.enum([
    'loanPartyName',
    'bankName',
    'loanAmount',
    'emiPaymentDate',
    'createdAt'
  ]).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ===================== BANK CONTACTS DTOs =====================

export const createLoanBankContactSchema = z.object({
  loanId: z.number().int().positive('Loan ID is required'),
  orgName: z.string().min(1, 'Organization name is required').max(255),
  personName: z.string().min(1, 'Person name is required').max(255),
  designation: z.string().max(255).optional().nullable(),
  phone: phoneNumber,
  email: z.string().email().optional().nullable(),
});

export const updateLoanBankContactSchema = createLoanBankContactSchema
  .omit({ loanId: true })
  .partial();

// ===================== DUE EMIS DTOs =====================

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

// ===================== TDS RECOVERIES DTOs =====================

export const createTdsRecoverySchema = z.object({
  loanId: z.number().int().positive('Loan ID is required'),
  tdsAmount: decimalString.refine(
    (val) => parseFloat(val as string) > 0,
    { message: 'TDS amount must be greater than 0' }
  ),
  tdsDocument: fileArray,
  tdsDate: dateString,
  tdsRecoveryBankDetails: z.string().max(2000).optional().nullable(),
});

export const updateTdsRecoverySchema = createTdsRecoverySchema
  .omit({ loanId: true })
  .partial();

// ===================== ID PARAMS =====================

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid ID'),
});

export const loanIdParamSchema = z.object({
  loanId: z.coerce.number().int().positive('Invalid Loan ID'),
});

// ===================== TYPE EXPORTS =====================

export type CreateLoanAdvanceDto = z.infer<typeof createLoanAdvanceSchema>;
export type UpdateLoanAdvanceDto = z.infer<typeof updateLoanAdvanceSchema>;
export type LoanClosureDto = z.infer<typeof loanClosureSchema>;
export type LoanAdvanceQuery = z.infer<typeof loanAdvanceQuerySchema>;

export type CreateLoanBankContactDto = z.infer<typeof createLoanBankContactSchema>;
export type UpdateLoanBankContactDto = z.infer<typeof updateLoanBankContactSchema>;

export type CreateDueEmiDto = z.infer<typeof createDueEmiSchema>;
export type UpdateDueEmiDto = z.infer<typeof updateDueEmiSchema>;

export type CreateTdsRecoveryDto = z.infer<typeof createTdsRecoverySchema>;
export type UpdateTdsRecoveryDto = z.infer<typeof updateTdsRecoverySchema>;

// ===================== RESPONSE TYPES =====================

export interface LoanAdvanceResponse {
  id: number;
  loanPartyName: string;
  bankName: string;
  loanAccNo: string;
  typeOfLoan: string;
  loanAmount: string;
  sanctionLetterDate: string;
  emiPaymentDate: string;
  lastEmiDate: string | null;
  sanctionLetter: string[] | null;
  bankLoanSchedule: string[] | null;
  loanSchedule: string | null;
  chargeMcaWebsite: string;
  tdsToBeDeductedOnInterest: string;
  loanCloseStatus: string;
  closureCreatedMca: string[] | null;
  bankNocDocument: string[] | null;
  principleOutstanding: string | null;
  totalInterestPaid: string | null;
  totalPenalChargesPaid: string | null;
  totalTdsToRecover: string | null;
  noOfEmisPaid: number | null;
  isDue: boolean;
  showNocUpload: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanBankContactResponse {
  id: number;
  loanId: number;
  orgName: string;
  personName: string;
  designation: string | null;
  phone: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DueEmiResponse {
  id: number;
  loanId: number;
  emiDate: string;
  principlePaid: string;
  interestPaid: string;
  tdsToBeRecovered: string;
  penalChargesPaid: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TdsRecoveryResponse {
  id: number;
  loanId: number;
  tdsAmount: string;
  tdsDocument: string[] | null;
  tdsDate: string;
  tdsRecoveryBankDetails: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanFullDetailsResponse extends LoanAdvanceResponse {
  bankContacts: LoanBankContactResponse[];
  loanDueEmis: DueEmiResponse[];
  loanTdsRecoveries: TdsRecoveryResponse[];
}
