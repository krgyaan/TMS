import { z } from 'zod';
import {
  LoanAdvanceFormSchema,
  LoanClosureFormSchema,
  BankContactFormSchema,
  DueEmiFormSchema,
  TdsRecoveryFormSchema,
  LoanAdvanceQuerySchema,
} from './loanAdvance.schema';

// ===================== FORM VALUE TYPES =====================

export type LoanAdvanceFormValues = z.infer<typeof LoanAdvanceFormSchema>;
export type LoanClosureFormValues = z.infer<typeof LoanClosureFormSchema>;
export type BankContactFormValues = z.infer<typeof BankContactFormSchema>;
export type DueEmiFormValues = z.infer<typeof DueEmiFormSchema>;
export type TdsRecoveryFormValues = z.infer<typeof TdsRecoveryFormSchema>;
export type LoanAdvanceQueryValues = z.infer<typeof LoanAdvanceQuerySchema>;

// ===================== API RESPONSE TYPES =====================

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
  sanctionLetter: string | null;
  bankLoanSchedule: string | null;
  loanSchedule: string | null;
  chargeMcaWebsite: string;
  tdsToBeDeductedOnInterest: string;
  loanCloseStatus: string;
  closureCreatedMca: string | null;
  bankNocDocument: string | null;
  principleOutstanding: string | null;
  totalInterestPaid: string | null;
  totalPenalChargesPaid: string | null;
  totalTdsToRecover: string | null;
  noOfEmisPaid: number | null;
  isDue: boolean;
  showNocUpload: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoanAdvanceListRow {
  id: number;
  loanPartyName: string | null;
  bankName: string | null;
  loanAccNo: string | null;
  typeOfLoan: string | null;
  loanAmount: string | null;
  sanctionLetterDate: string | null;
  emiPaymentDate: string | null;
  lastEmiDate: string | null;
  sanctionLetter: string | null;
  bankLoanSchedule: string | null;
  loanSchedule: string | null;
  chargeMcaWebsite: string | null;
  tdsToBeDeductedOnInterest: string | null;
  loanCloseStatus: string | null;
  principleOutstanding: string | null;
  totalInterestPaid: string | null;
  totalPenalChargesPaid: string | null;
  totalTdsToRecover: string | null;
  noOfEmisPaid: number | null;
  isDue: boolean;
  showNocUpload: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BankContactResponse {
  id: number;
  loanId: number;
  orgName: string;
  personName: string;
  designation: string | null;
  phone: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankContactListRow {
  id: number;
  loanId: number;
  orgName: string | null;
  personName: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DueEmiResponse {
  id: number;
  loanId: number;
  emiDate: string;
  principlePaid: string;
  interestPaid: string;
  tdsToBeRecovered: string;
  penalChargesPaid: string;
  createdAt: string;
  updatedAt: string;
}

export interface DueEmiListRow {
  id: number;
  loanId: number;
  emiDate: string | null;
  principlePaid: string | null;
  interestPaid: string | null;
  tdsToBeRecovered: string | null;
  penalChargesPaid: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TdsRecoveryResponse {
  id: number;
  loanId: number;
  tdsAmount: string;
  tdsDocument: string | null;
  tdsDate: string;
  tdsRecoveryBankDetails: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TdsRecoveryListRow {
  id: number;
  loanId: number;
  tdsAmount: string | null;
  tdsDocument: string | null;
  tdsDate: string | null;
  tdsRecoveryBankDetails: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ===================== FULL DETAILS RESPONSE =====================

export interface LoanAdvanceFullDetails extends LoanAdvanceResponse {
  bankContacts: BankContactResponse[];
  dueEmis: DueEmiResponse[];
  tdsRecoveries: TdsRecoveryResponse[];
}

// ===================== CREATE DTOs =====================

export interface CreateLoanAdvanceDto {
  loanPartyName: string;
  bankName: string;
  loanAccNo: string;
  typeOfLoan: string;
  loanAmount: string;
  sanctionLetterDate: string;
  emiPaymentDate: string;
  lastEmiDate?: string | null;
  sanctionLetter?: string[] | null;
  bankLoanSchedule?: string[] | null;
  loanSchedule?: string | null;
  chargeMcaWebsite?: string;
  tdsToBeDeductedOnInterest?: string;
  principleOutstanding?: string;
}

export interface CreateBankContactDto {
  loanId: number;
  orgName: string;
  personName: string;
  designation?: string | null;
  phone: string;
  email?: string | null;
}

export interface CreateDueEmiDto {
  loanId: number;
  emiDate: string;
  principlePaid: string;
  interestPaid: string;
  tdsToBeRecovered?: string;
  penalChargesPaid?: string;
}

export interface CreateTdsRecoveryDto {
  loanId: number;
  tdsAmount: string;
  tdsDocument?: string[] | null;
  tdsDate: string;
  tdsRecoveryBankDetails?: string | null;
}

export interface LoanClosureDto {
  bankNocDocument: string[];
  closureCreatedMca?: string[] | null;
}

// ===================== UPDATE DTOs =====================

export interface UpdateLoanAdvanceDto {
  id: number;
  loanPartyName?: string;
  bankName?: string;
  loanAccNo?: string;
  typeOfLoan?: string;
  loanAmount?: string;
  sanctionLetterDate?: string;
  emiPaymentDate?: string;
  lastEmiDate?: string | null;
  sanctionLetter?: string[] | null;
  bankLoanSchedule?: string[] | null;
  loanSchedule?: string | null;
  chargeMcaWebsite?: string;
  tdsToBeDeductedOnInterest?: string;
}

export interface UpdateBankContactDto {
  id: number;
  orgName?: string;
  personName?: string;
  designation?: string | null;
  phone?: string;
  email?: string | null;
}

export interface UpdateDueEmiDto {
  id: number;
  emiDate?: string;
  principlePaid?: string;
  interestPaid?: string;
  tdsToBeRecovered?: string;
  penalChargesPaid?: string;
}

export interface UpdateTdsRecoveryDto {
  id: number;
  tdsAmount?: string;
  tdsDocument?: string[] | null;
  tdsDate?: string;
  tdsRecoveryBankDetails?: string | null;
}

// ===================== LIST PARAMS =====================

export interface LoanAdvanceListParams {
  page?: number;
  limit?: number;
  sortBy?: 'loanPartyName' | 'bankName' | 'loanAmount' | 'emiPaymentDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  loanPartyName?: string;
  typeOfLoan?: string;
  loanCloseStatus?: string;
}

// ===================== PAGINATED RESPONSE =====================

export interface PaginatedMeta {
  total: number;
  page: number;
  stringmit: number;
  totalPages:string;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export type LoanAdvanceListResponse = PaginatedResponse<LoanAdvanceListRow>;

// ===================== DROPDOWN OPTIONS =====================

export interface SelectOption {
  label: string;
  value: string;
}

export const LOAN_PARTY_OPTIONS: SelectOption[] = [
  { label: 'Volks Energie', value: 'Volks Energie' },
  { label: 'Cafeena', value: 'Cafeena' },
  { label: 'PG', value: 'PG' },
  { label: 'Arjun', value: 'Arjun' },
  { label: 'Geeta Goyal', value: 'Geeta Goyal' },
  { label: 'SLG', value: 'SLG' },
  { label: 'Sonal Badkur', value: 'Sonal Badkur' },
  { label: 'Sabr Enterprises', value: 'Sabr Enterprises' },
  { label: 'Toshitaa Transformations', value: 'Toshitaa Transformations' },
];

export const LOAN_TYPE_OPTIONS: SelectOption[] = [
    { label: 'Business Loan', value: 'Business Loan' },
    { label: 'Term Loan', value: 'Term Loan' },
    { label: 'CC/Limit', value: 'CC/Limit' },
];

export const YES_NO_SELECT_OPTIONS: SelectOption[] = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
];

export const LOAN_STATUS_SELECT_OPTIONS: SelectOption[] = [
  { label: 'Active', value: 'Active' },
  { label: 'Closed', value: 'Closed' },
];
