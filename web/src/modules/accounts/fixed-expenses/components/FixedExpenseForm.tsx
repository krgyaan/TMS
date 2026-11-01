import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, type Resolver, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Receipt, Landmark } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { FixedExpenseFormSchema } from '../helpers/fixedExpense.schema';
import {
    type FixedExpenseFormValues,
    type FixedExpenseResponse,
    type FixedExpenseListRow,
    FIXED_EXPENSE_TYPE_OPTIONS,
    FIXED_EXPENSE_AMOUNT_TYPE_OPTIONS,
    FIXED_EXPENSE_PAYMENT_MODE_OPTIONS,
    FIXED_EXPENSE_FREQUENCY_OPTIONS,
} from '../helpers/fixedExpense.types';
import {
    buildFixedExpenseDefaultValues,
    mapFixedExpenseFormToCreateDto,
    mapFixedExpenseFormToUpdateDto,
    mapFixedExpenseResponseToForm,
} from '../helpers/fixedExpense.mappers';
import { useCreateFixedExpense, useUpdateFixedExpense } from '@/hooks/api/useFixedExpense';
import { SelectField } from '@/components/form/SelectField';
import { DateInput } from '@/components/form/DateInput';

interface FixedExpenseFormProps {
    mode: 'create' | 'edit';
    existingData?: FixedExpenseResponse | FixedExpenseListRow;
}

export function FixedExpenseForm({ mode, existingData }: FixedExpenseFormProps) {
    const navigate = useNavigate();

    const createMutation = useCreateFixedExpense();
    const updateMutation = useUpdateFixedExpense();

    // Compute initial values based on mode
    const initialValues = useMemo(() => {
        if (mode === 'edit' && existingData) {
            return mapFixedExpenseResponseToForm(existingData);
        }
        return buildFixedExpenseDefaultValues();
    }, [mode, existingData]);

    const form = useForm<FixedExpenseFormValues>({
        resolver: zodResolver(FixedExpenseFormSchema) as Resolver<FixedExpenseFormValues>,
        defaultValues: initialValues,
    });

    const paymentMode = useWatch({ control: form.control, name: 'paymentMode' });
    const isBankTransfer = paymentMode === 'bank_transfer';

    // Reset form when initial values change
    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit: SubmitHandler<FixedExpenseFormValues> = async (values) => {
        try {
            if (mode === 'create') {
                await createMutation.mutateAsync(mapFixedExpenseFormToCreateDto(values));
            } else if (existingData?.id) {
                await updateMutation.mutateAsync({
                    id: existingData.id,
                    data: mapFixedExpenseFormToUpdateDto(values),
                });
            }
            navigate(paths.accounts.fixedExpenses);
        } catch (error) {
            console.error('Error submitting fixed expense form:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'create' ? 'New' : 'Edit'} Fixed Expense</CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create'
                                ? 'Add a new fixed expense entry'
                                : 'Update fixed expense information'}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        {/* Expense Details */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-muted-foreground" />
                                <h3 className="text-lg font-medium">Expense Details</h3>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <FieldWrapper control={form.control} name="partyName" label="Party Name">
                                    {(field) => (
                                        <Input {...field} placeholder="Enter party / payee name" />
                                    )}
                                </FieldWrapper>

                                <SelectField
                                    control={form.control}
                                    name="type"
                                    label="Type"
                                    options={FIXED_EXPENSE_TYPE_OPTIONS}
                                    placeholder="Select expense type"
                                />

                                <SelectField
                                    control={form.control}
                                    name="amountType"
                                    label="Amount Type"
                                    options={FIXED_EXPENSE_AMOUNT_TYPE_OPTIONS}
                                    placeholder="Select amount type"
                                />

                                <FieldWrapper control={form.control} name="amount" label="Amount (₹)">
                                    {(field) => (
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="dueDate" label="Due Date">
                                    {(field) => (
                                        <DateInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                        />
                                    )}
                                </FieldWrapper>

                                <SelectField
                                    control={form.control}
                                    name="paymentFrequency"
                                    label="Payment Frequency"
                                    options={FIXED_EXPENSE_FREQUENCY_OPTIONS}
                                    placeholder="Select frequency"
                                />
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Landmark className="h-5 w-5 text-muted-foreground" />
                                <h3 className="text-lg font-medium">Payment Details</h3>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <SelectField
                                    control={form.control}
                                    name="paymentMode"
                                    label="Payment Mode"
                                    options={FIXED_EXPENSE_PAYMENT_MODE_OPTIONS}
                                    placeholder="Select payment mode"
                                />

                                {isBankTransfer && (
                                    <>
                                        <FieldWrapper
                                            control={form.control}
                                            name="accountName"
                                            label="Account Name"
                                        >
                                            {(field) => (
                                                <Input {...field} placeholder="Account holder name" />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="accountNumber"
                                            label="Account Number"
                                        >
                                            {(field) => (
                                                <Input {...field} placeholder="Bank account number" />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="ifscCode"
                                            label="IFSC Code"
                                        >
                                            {(field) => (
                                                <Input
                                                    {...field}
                                                    placeholder="e.g. HDFC0001234"
                                                    className="uppercase"
                                                />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}
                            </div>

                            {isBankTransfer && (
                                <p className="text-sm text-muted-foreground">
                                    Bank account details are required for bank transfer.
                                </p>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.reset(initialValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'create' ? 'Create Expense' : 'Update Expense'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default FixedExpenseForm;
