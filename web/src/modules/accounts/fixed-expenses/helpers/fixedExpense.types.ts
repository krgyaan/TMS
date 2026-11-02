import type { FixedExpenseFormValues } from './fixedExpense.schema';

// ===================== ENUM TYPES =====================

export type FixedExpenseType =
    | 'imprest'
    | 'communication'
    | 'courier'
    | 'electricity'
    | 'rent'
    | 'emi'
    | 'salary'
    | 'software'
    | 'office_expenses'
    | 'printing_stationary'
    | 'office_maintenance'
    | 'portal_renewal_charges'
    | 'professional_charges'
    | 'insurance'
    | 'registration_charges'
    | 'pop_charges'
    | 'bank_charges'
    | 'diwali_gift_expenses';

export type FixedExpenseFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

export type FixedExpensePaymentMode = 'auto_debit' | 'bank_transfer';

export type FixedExpenseAmountType = 'fixed' | 'variable';

export type FixedExpenseStatus = 'New';

// ===================== API TYPES =====================

export interface FixedExpenseResponse {
    id: number;
    partyName: string;
    amountType: FixedExpenseAmountType;
    amount: string;
    paymentMode: FixedExpensePaymentMode;
    accountName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    type: FixedExpenseType;
    dueDate: string;
    paymentFrequency: FixedExpenseFrequency;
    status: FixedExpenseStatus;
    deleteStatus: boolean;
    makerId: number | null;
    makerName?: string | null;
    createdBy: number;
    createdByName?: string | null;
    createdAt: string;
    updatedAt: string;
}

export type FixedExpenseListRow = FixedExpenseResponse;

export interface FixedExpenseListParams {
    page?: number;
    limit?: number;
    search?: string;
    type?: FixedExpenseType;
    paymentFrequency?: FixedExpenseFrequency;
    paymentMode?: FixedExpensePaymentMode;
    amountType?: FixedExpenseAmountType;
    deleteStatus?: boolean;
    sortBy?: 'partyName' | 'amount' | 'type' | 'dueDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface CreateFixedExpenseDto {
    partyName: string;
    amountType: FixedExpenseAmountType;
    amount: string;
    paymentMode: FixedExpensePaymentMode;
    accountName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    type: FixedExpenseType;
    dueDate: string;
    paymentFrequency: FixedExpenseFrequency;
    status?: FixedExpenseStatus;
    makerId?: number | null;
}

export type UpdateFixedExpenseDto = Partial<CreateFixedExpenseDto>;

export type { FixedExpenseFormValues };

// ===================== OPTION CONSTANTS =====================

export type FixedExpenseSelectOption = { value: string; label: string };

/**
 * Expense categories mirror the "Fixed" category group used by maker requests
 * (`fixedCategory` in modules/shared/maker-requests/CreateMakerRequestPage.tsx).
 */
export const FIXED_EXPENSE_TYPE_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'imprest', label: 'Imprest' },
    { value: 'communication', label: 'Communication' },
    { value: 'courier', label: 'Courier' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'rent', label: 'Rent' },
    { value: 'emi', label: 'EMI' },
    { value: 'salary', label: 'Salary' },
    { value: 'software', label: 'Software' },
    { value: 'office_expenses', label: 'Office Expenses' },
    { value: 'printing_stationary', label: 'Printing & Stationary' },
    { value: 'office_maintenance', label: 'Office Maintenance' },
    { value: 'portal_renewal_charges', label: 'Portal Renewal Charges' },
    { value: 'professional_charges', label: 'Professional Charges' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'registration_charges', label: 'Registration Charges' },
    { value: 'pop_charges', label: 'POP Charges' },
    { value: 'bank_charges', label: 'Bank Charges' },
    { value: 'diwali_gift_expenses', label: 'Diwali/Gift Expenses' },
];

export const FIXED_EXPENSE_FREQUENCY_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'half_yearly', label: 'Half Yearly' },
    { value: 'annual', label: 'Annual' },
];

export const FIXED_EXPENSE_PAYMENT_MODE_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'auto_debit', label: 'Auto Debit' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
];

export const FIXED_EXPENSE_AMOUNT_TYPE_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'fixed', label: 'Fixed' },
    { value: 'variable', label: 'Variable' },
];

export const FIXED_EXPENSE_STATUS_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'New', label: 'New' },
];

export const FIXED_EXPENSE_ARCHIVE_FILTER_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
] as const;

export type FixedExpenseArchiveFilter = (typeof FIXED_EXPENSE_ARCHIVE_FILTER_OPTIONS)[number]['value'];

// ===================== LABEL MAPS =====================

export const FIXED_EXPENSE_TYPE_LABELS: Record<FixedExpenseType, string> = {
    imprest: 'Imprest',
    communication: 'Communication',
    courier: 'Courier',
    electricity: 'Electricity',
    rent: 'Rent',
    emi: 'EMI',
    salary: 'Salary',
    software: 'Software',
    office_expenses: 'Office Expenses',
    printing_stationary: 'Printing & Stationary',
    office_maintenance: 'Office Maintenance',
    portal_renewal_charges: 'Portal Renewal Charges',
    professional_charges: 'Professional Charges',
    insurance: 'Insurance',
    registration_charges: 'Registration Charges',
    pop_charges: 'POP Charges',
    bank_charges: 'Bank Charges',
    diwali_gift_expenses: 'Diwali/Gift Expenses',
};

export const FIXED_EXPENSE_FREQUENCY_LABELS: Record<FixedExpenseFrequency, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    half_yearly: 'Half Yearly',
    annual: 'Annual',
};

export const FIXED_EXPENSE_PAYMENT_MODE_LABELS: Record<FixedExpensePaymentMode, string> = {
    auto_debit: 'Auto Debit',
    bank_transfer: 'Bank Transfer',
};

export const FIXED_EXPENSE_AMOUNT_TYPE_LABELS: Record<FixedExpenseAmountType, string> = {
    fixed: 'Fixed',
    variable: 'Variable',
};

export const FIXED_EXPENSE_STATUS_LABELS: Record<FixedExpenseStatus, string> = {
    New: 'New',
};
