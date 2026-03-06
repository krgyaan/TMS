import { z } from 'zod';

const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
  .or(z.number().transform((val) => val.toString()))
  .or(z.literal(''));

const phoneNumber = z
  .string()
  .min(10, 'Phone must be at least 10 digits')
  .max(20, 'Phone must not exceed 20 characters')
  .regex(/^[+]?[\d\s-]+$/, 'Invalid phone format');

const optionalFile = z.array(z.string()).nullable().optional();

// ===================== LOAN ADVANCE FORM SCHEMA =====================

export const LoanAdvanceFormSchema = z.object({
  loanPartyName: z.string(),
  bankName: z.string().min(1, 'Bank/NBFC name is required').max(255),
  loanAccNo: z.string().min(1, 'Loan account number is required').max(100),
  typeOfLoan: z.string(),
  loanAmount: z
    .string()
    .min(1, 'Loan amount is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  sanctionLetterDate: z.string().min(1, 'Sanction letter date is required'),
  emiPaymentDate: z.string().min(1, 'EMI payment date is required'),
  lastEmiDate: z.string().optional().nullable(),
  sanctionLetter: optionalFile,
  bankLoanSchedule: optionalFile,
  loanSchedule: z.string().max(2000).optional().nullable(),
  chargeMcaWebsite: z.string().default('No'),
  tdsToBeDeductedOnInterest: z.string().default('No'),
  principleOutstanding: decimalString.optional(),
});

export type LoanAdvanceFormValues = z.infer<typeof LoanAdvanceFormSchema>;

// ===================== LOAN CLOSURE FORM SCHEMA =====================

export const LoanClosureFormSchema = z.object({
  bankNocDocument: z.array(z.string()).min(1, 'Bank NOC document is required'),
  closureCreatedMca: optionalFile,
});

export type LoanClosureFormValues = z.infer<typeof LoanClosureFormSchema>;

// ===================== BANK CONTACT FORM SCHEMA =====================

export const BankContactFormSchema = z.object({
  orgName: z.string().min(1, 'Organization name is required').max(255),
  personName: z.string().min(1, 'Person name is required').max(255),
  designation: z.string().max(255).optional().nullable(),
  phone: phoneNumber,
  email: z.email('Invalid email').optional().or(z.literal('')),
});

export type BankContactFormValues = z.infer<typeof BankContactFormSchema>;

// ===================== DUE EMI FORM SCHEMA =====================

export const DueEmiFormSchema = z
  .object({
    emiDate: z.string().min(1, 'EMI date is required'),
    principlePaid: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount')
      .or(z.literal('')),
    interestPaid: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount')
      .or(z.literal('')),
    tdsToBeRecovered: decimalString.optional().default('0'),
    penalChargesPaid: decimalString.optional().default('0'),
  })
  .refine(
    (data) => {
      const principle = parseFloat(data.principlePaid || '0');
      const interest = parseFloat(data.interestPaid || '0');
      return principle > 0 || interest > 0;
    },
    {
      message: 'Either principle or interest paid must be greater than 0',
      path: ['principlePaid'],
    }
  );

export type DueEmiFormValues = z.infer<typeof DueEmiFormSchema>;

// ===================== TDS RECOVERY FORM SCHEMA =====================

export const TdsRecoveryFormSchema = z.object({
  tdsAmount: z
    .string()
    .min(1, 'TDS amount is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount')
    .refine((val) => parseFloat(val) > 0, 'TDS amount must be greater than 0'),
  tdsDocument: optionalFile,
  tdsDate: z.string().min(1, 'TDS recovery date is required'),
  tdsRecoveryBankDetails: z.string().max(2000).optional().nullable(),
});

export type TdsRecoveryFormValues = z.infer<typeof TdsRecoveryFormSchema>;

// ===================== QUERY/FILTER SCHEMA =====================

export const LoanAdvanceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  loanPartyName: z.string().optional(),
  typeOfLoan: z.string().optional(),
  loanCloseStatus: z.string().optional(),
  sortBy: z
    .enum(['loanPartyName', 'bankName', 'loanAmount', 'emiPaymentDate', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type LoanAdvanceQueryValues = z.infer<typeof LoanAdvanceQuerySchema>;
