import type {
  // Form Values
  LoanAdvanceFormValues,
  LoanClosureFormValues,
  BankContactFormValues,
  DueEmiFormValues,
  TdsRecoveryFormValues,
  // Responses
  LoanAdvanceResponse,
  LoanAdvanceListRow,
  BankContactResponse,
  BankContactListRow,
  DueEmiResponse,
  DueEmiListRow,
  TdsRecoveryResponse,
  TdsRecoveryListRow,
  // DTOs
  CreateLoanAdvanceDto,
  UpdateLoanAdvanceDto,
  CreateBankContactDto,
  UpdateBankContactDto,
  CreateDueEmiDto,
  UpdateDueEmiDto,
  CreateTdsRecoveryDto,
  UpdateTdsRecoveryDto,
  LoanClosureDto,
} from './loanAdvance.types';

// ===================== UTILITY FUNCTIONS =====================

/**
 * Normalize file paths (handles backslashes, null, undefined)
 */
const normalizeFilePaths = (value: string | string[] | null | undefined): string[] => {
  if (!value) return [];

  const paths = Array.isArray(value) ? value : [value];

  return paths
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .map((p) => p.trim().replace(/\\/g, '/').replace(/\/+/g, '/'));
};

/**
 * Convert file paths to array or null (for API payload)
 */
const filePathsToArray = (paths: string[] | null | undefined): string[] | null => {
  if (!paths || paths.length === 0) return null;
  return paths;
};

/**
 * Parse string to decimal string with 2 decimal places
 */
const toDecimalString = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

/**
 * Safe string getter
 */
const safeString = (value: string | null | undefined, defaultValue = ''): string => {
  return value ?? defaultValue;
};

/**
 * Format date string to YYYY-MM-DD
 */
const formatDateString = (value: string | null | undefined): string => {
  if (!value) return '';
  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Try to parse and format
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

// ===================== LOAN ADVANCE MAPPERS =====================

/**
 * Build default values for Loan Advance form (create mode)
 */
export const buildLoanAdvanceDefaultValues = (): LoanAdvanceFormValues => {
  return {
    loanPartyName: '',
    bankName: '',
    loanAccNo: '',
    typeOfLoan: '',
    loanAmount: '',
    sanctionLetterDate: '',
    emiPaymentDate: '',
    lastEmiDate: null,
    sanctionLetter: [],
    bankLoanSchedule: [],
    loanSchedule: null,
    chargeMcaWebsite: 'No',
    tdsToBeDeductedOnInterest: 'No',
    principleOutstanding: '',
  };
};

/**
 * Map API response to Loan Advance form values (edit mode)
 */
export const mapLoanAdvanceResponseToForm = (
  response: LoanAdvanceResponse | LoanAdvanceListRow
): LoanAdvanceFormValues => {
  return {
    loanPartyName: (response.loanPartyName ?? 'PG'),
    bankName: safeString(response.bankName),
    loanAccNo: safeString(response.loanAccNo),
    typeOfLoan: (response.typeOfLoan ?? 'Term Loan'),
    loanAmount: toDecimalString(response.loanAmount),
    sanctionLetterDate: formatDateString(response.sanctionLetterDate),
    emiPaymentDate: formatDateString(response.emiPaymentDate),
    lastEmiDate: response.lastEmiDate ? formatDateString(response.lastEmiDate) : null,
    sanctionLetter: normalizeFilePaths(response.sanctionLetter),
    bankLoanSchedule: normalizeFilePaths(response.bankLoanSchedule),
    loanSchedule: response.loanSchedule ?? null,
    chargeMcaWebsite: (response.chargeMcaWebsite ?? 'No'),
    tdsToBeDeductedOnInterest: (response.tdsToBeDeductedOnInterest ?? 'No'),
    principleOutstanding: toDecimalString(response.principleOutstanding),
  };
};

/**
 * Map Loan Advance form values to Create DTO
 */
export const mapLoanAdvanceFormToCreateDto = (
  values: LoanAdvanceFormValues
): CreateLoanAdvanceDto => {
  return {
    loanPartyName: values.loanPartyName,
    bankName: values.bankName,
    loanAccNo: values.loanAccNo,
    typeOfLoan: values.typeOfLoan,
    loanAmount: values.loanAmount,
    sanctionLetterDate: values.sanctionLetterDate,
    emiPaymentDate: values.emiPaymentDate,
    lastEmiDate: values.lastEmiDate || null,
    sanctionLetter: filePathsToArray(values.sanctionLetter),
    bankLoanSchedule: filePathsToArray(values.bankLoanSchedule),
    loanSchedule: values.loanSchedule || null,
    chargeMcaWebsite: values.chargeMcaWebsite,
    tdsToBeDeductedOnInterest: values.tdsToBeDeductedOnInterest,
    principleOutstanding: values.principleOutstanding || values.loanAmount,
  };
};

/**
 * Map Loan Advance form values to Update DTO
 */
export const mapLoanAdvanceFormToUpdateDto = (
  id: number,
  values: LoanAdvanceFormValues
): UpdateLoanAdvanceDto => {
  return {
    id,
    loanPartyName: values.loanPartyName,
    bankName: values.bankName,
    loanAccNo: values.loanAccNo,
    typeOfLoan: values.typeOfLoan,
    loanAmount: values.loanAmount,
    sanctionLetterDate: values.sanctionLetterDate,
    emiPaymentDate: values.emiPaymentDate,
    lastEmiDate: values.lastEmiDate || null,
    sanctionLetter: filePathsToArray(values.sanctionLetter),
    bankLoanSchedule: filePathsToArray(values.bankLoanSchedule),
    loanSchedule: values.loanSchedule || null,
    chargeMcaWebsite: values.chargeMcaWebsite,
    tdsToBeDeductedOnInterest: values.tdsToBeDeductedOnInterest,
  };
};

// ===================== LOAN CLOSURE MAPPERS =====================

/**
 * Build default values for Loan Closure form
 */
export const buildLoanClosureDefaultValues = (): LoanClosureFormValues => {
  return {
    bankNocDocument: [],
    closureCreatedMca: [],
  };
};

/**
 * Map Loan Closure form values to DTO
 */
export const mapLoanClosureFormToDto = (values: LoanClosureFormValues): LoanClosureDto => {
  return {
    bankNocDocument: values.bankNocDocument,
    closureCreatedMca: filePathsToArray(values.closureCreatedMca),
  };
};

// ===================== BANK CONTACT MAPPERS =====================

/**
 * Build default values for Bank Contact form (auto-fill org name from bank)
 */
export const buildBankContactDefaultValues = (bankName?: string): BankContactFormValues => {
  return {
    orgName: bankName ?? '',
    personName: '',
    designation: null,
    phone: '',
    email: '',
  };
};

/**
 * Map API response to Bank Contact form values (edit mode)
 */
export const mapBankContactResponseToForm = (
  response: BankContactResponse | BankContactListRow
): BankContactFormValues => {
  return {
    orgName: safeString(response.orgName),
    personName: safeString(response.personName),
    designation: response.designation ?? null,
    phone: safeString(response.phone),
    email: response.email ?? '',
  };
};

/**
 * Map Bank Contact form values to Create DTO
 */
export const mapBankContactFormToCreateDto = (
  loanId: number,
  values: BankContactFormValues
): CreateBankContactDto => {
  return {
    loanId,
    orgName: values.orgName,
    personName: values.personName,
    designation: values.designation || null,
    phone: values.phone,
    email: values.email || null,
  };
};

/**
 * Map Bank Contact form values to Update DTO
 */
export const mapBankContactFormToUpdateDto = (
  id: number,
  values: BankContactFormValues
): UpdateBankContactDto => {
  return {
    id,
    orgName: values.orgName,
    personName: values.personName,
    designation: values.designation || null,
    phone: values.phone,
    email: values.email || null,
  };
};

// ===================== DUE EMI MAPPERS =====================

/**
 * Build default values for Due EMI form
 */
export const buildDueEmiDefaultValues = (): DueEmiFormValues => {
  return {
    emiDate: new Date().toISOString().split('T')[0],
    principlePaid: '',
    interestPaid: '',
    tdsToBeRecovered: '0',
    penalChargesPaid: '0',
  };
};

/**
 * Map API response to Due EMI form values (edit mode)
 */
export const mapDueEmiResponseToForm = (
  response: DueEmiResponse | DueEmiListRow
): DueEmiFormValues => {
  return {
    emiDate: formatDateString(response.emiDate),
    principlePaid: toDecimalString(response.principlePaid),
    interestPaid: toDecimalString(response.interestPaid),
    tdsToBeRecovered: toDecimalString(response.tdsToBeRecovered),
    penalChargesPaid: toDecimalString(response.penalChargesPaid),
  };
};

/**
 * Map Due EMI form values to Create DTO
 */
export const mapDueEmiFormToCreateDto = (
  loanId: number,
  values: DueEmiFormValues
): CreateDueEmiDto => {
  return {
    loanId,
    emiDate: values.emiDate,
    principlePaid: values.principlePaid || '0',
    interestPaid: values.interestPaid || '0',
    tdsToBeRecovered: values.tdsToBeRecovered || '0',
    penalChargesPaid: values.penalChargesPaid || '0',
  };
};

/**
 * Map Due EMI form values to Update DTO
 */
export const mapDueEmiFormToUpdateDto = (
  id: number,
  values: DueEmiFormValues
): UpdateDueEmiDto => {
  return {
    id,
    emiDate: values.emiDate,
    principlePaid: values.principlePaid || '0',
    interestPaid: values.interestPaid || '0',
    tdsToBeRecovered: values.tdsToBeRecovered || '0',
    penalChargesPaid: values.penalChargesPaid || '0',
  };
};


// ===================== TDS RECOVERY MAPPERS =====================

/**
 * Build default values for TDS Recovery form
 */
export const buildTdsRecoveryDefaultValues = (): TdsRecoveryFormValues => {
  return {
    tdsAmount: '',
    tdsDocument: [],
    tdsDate: new Date().toISOString().split('T')[0],
    tdsRecoveryBankDetails: null,
  };
};

/**
 * Map API response to TDS Recovery form values (edit mode)
 */
export const mapTdsRecoveryResponseToForm = (
  response: TdsRecoveryResponse | TdsRecoveryListRow
): TdsRecoveryFormValues => {
  return {
    tdsAmount: toDecimalString(response.tdsAmount),
    tdsDocument: normalizeFilePaths(response.tdsDocument),
    tdsDate: formatDateString(response.tdsDate),
    tdsRecoveryBankDetails: response.tdsRecoveryBankDetails ?? null,
  };
};

/**
 * Map TDS Recovery form values to Create DTO
 */
export const mapTdsRecoveryFormToCreateDto = (
  loanId: number,
  values: TdsRecoveryFormValues
): CreateTdsRecoveryDto => {
  return {
    loanId,
    tdsAmount: values.tdsAmount,
    tdsDocument: filePathsToArray(values.tdsDocument),
    tdsDate: values.tdsDate,
    tdsRecoveryBankDetails: values.tdsRecoveryBankDetails || null,
  };
};

/**
 * Map TDS Recovery form values to Update DTO
 */
export const mapTdsRecoveryFormToUpdateDto = (
  id: number,
  values: TdsRecoveryFormValues
): UpdateTdsRecoveryDto => {
  return {
    id,
    tdsAmount: values.tdsAmount,
    tdsDocument: filePathsToArray(values.tdsDocument),
    tdsDate: values.tdsDate,
    tdsRecoveryBankDetails: values.tdsRecoveryBankDetails || null,
  };
};

// ===================== DISPLAY FORMATTERS =====================

/**
 * Format currency for display
 */
export const formatCurrency = (value: string | number | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num);
};

/**
 * Format date for display (DD-MM-YYYY)
 */
export const formatDateDisplay = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Get loan status badge color
 */
export const getLoanStatusColor = (status: string | null | undefined): string => {
  switch (status) {
    case 'Active':
      return 'green';
    case 'Closed':
      return 'gray';
    default:
      return 'blue';
  }
};

/**
 * Get due badge color
 */
export const getDueBadgeColor = (isDue: boolean): string => {
  return isDue ? 'red' : 'green';
};
