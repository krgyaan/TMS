import type { FixedExpenseFormValues } from './fixedExpense.schema';
import type {
    CreateFixedExpenseDto,
    FixedExpenseListRow,
    FixedExpenseResponse,
    UpdateFixedExpenseDto,
} from './fixedExpense.types';

// ===================== UTILITIES =====================

const formatDateString = (value: string | null | undefined): string => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const emptyToNull = (value: string | null | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

// ===================== FORM MAPPERS =====================

export const buildFixedExpenseDefaultValues = (): FixedExpenseFormValues => ({
    partyName: '',
    amountType: 'fixed',
    amount: '',
    paymentMode: 'auto_debit',
    selectedBeneficiaryId: '',
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    type: 'electricity',
    dueDate: '',
    paymentFrequency: 'monthly',
});

export const mapFixedExpenseResponseToForm = (
    response: FixedExpenseResponse | FixedExpenseListRow
): FixedExpenseFormValues => ({
    partyName: response.partyName ?? '',
    amountType: response.amountType ?? 'fixed',
    amount: response.amount ?? '',
    paymentMode: response.paymentMode ?? 'auto_debit',
    selectedBeneficiaryId: '',
    accountName: response.accountName ?? '',
    accountNumber: response.accountNumber ?? '',
    ifscCode: response.ifscCode ?? '',
    type: response.type,
    dueDate: formatDateString(response.dueDate),
    paymentFrequency: response.paymentFrequency ?? 'monthly',
});

export const mapFixedExpenseFormToCreateDto = (
    values: FixedExpenseFormValues
): CreateFixedExpenseDto => ({
    partyName: values.partyName.trim(),
    amountType: values.amountType,
    amount: values.amountType === 'variable' ? '0' : values.amount,
    paymentMode: values.paymentMode,
    accountName: emptyToNull(values.accountName),
    accountNumber: emptyToNull(values.accountNumber),
    ifscCode: emptyToNull(values.ifscCode),
    type: values.type,
    dueDate: values.dueDate,
    paymentFrequency: values.paymentFrequency,
});

export const mapFixedExpenseFormToUpdateDto = (
    values: FixedExpenseFormValues
): UpdateFixedExpenseDto => ({
    ...mapFixedExpenseFormToCreateDto(values),
});
