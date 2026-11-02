import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, type Resolver, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Save, Receipt, Landmark, UserPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { paths } from '@/app/routes/paths';
import { FixedExpenseFormSchema } from '../helpers/fixedExpense.schema';
import {
    type FixedExpenseFormValues,
    type FixedExpenseResponse,
    type FixedExpenseListRow,
    FIXED_EXPENSE_TYPE_OPTIONS,
    FIXED_EXPENSE_AMOUNT_TYPE_OPTIONS,
    FIXED_EXPENSE_FREQUENCY_OPTIONS,
} from '../helpers/fixedExpense.types';
import {
    buildFixedExpenseDefaultValues,
    mapFixedExpenseFormToCreateDto,
    mapFixedExpenseFormToUpdateDto,
    mapFixedExpenseResponseToForm,
} from '../helpers/fixedExpense.mappers';
import { useCreateFixedExpense, useUpdateFixedExpense } from '@/hooks/api/useFixedExpense';
import { useBeneficiaries, useCreateBeneficiary } from '@/hooks/api/useProjectPaymentRequests';
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
    const amountType = useWatch({ control: form.control, name: 'amountType' });

    const { data: beneficiaries } = useBeneficiaries();
    const createBeneficiaryMutation = useCreateBeneficiary();
    const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false);
    const [newBeneficiary, setNewBeneficiary] = useState({
        name: '',
        accountNumber: '',
        ifsc: '',
    });

    const selectedBeneficiaryId = useWatch({
        control: form.control,
        name: 'selectedBeneficiaryId',
    });

    const beneficiaryOptions = useMemo(
        () =>
            (beneficiaries ?? []).map((b) => ({
                id: String(b.id),
                name: `${b.name ?? 'Unnamed'}${b.accountNumber ? ` (${b.accountNumber})` : ''}`,
            })),
        [beneficiaries]
    );

    // Selecting a beneficiary copies its bank details into the (editable) fields.
    useEffect(() => {
        if (!selectedBeneficiaryId || !beneficiaries) return;

        const ben = beneficiaries.find((b) => String(b.id) === selectedBeneficiaryId);
        if (!ben) return;

        form.setValue('accountName', ben.name ?? '');
        form.setValue('accountNumber', ben.accountNumber ?? '');
        form.setValue('ifscCode', ben.ifsc ?? '');
    }, [selectedBeneficiaryId, beneficiaries, form]);

    const handleAddBeneficiary = async () => {
        try {
            const created = await createBeneficiaryMutation.mutateAsync(newBeneficiary);
            form.setValue('selectedBeneficiaryId', String(created.id));
            setNewBeneficiary({ name: '', accountNumber: '', ifsc: '' });
            setIsAddBeneficiaryOpen(false);
            toast.success('Beneficiary added successfully');
        } catch {
            toast.error('Failed to add beneficiary');
        }
    };

    // Variable expenses don't have a fixed amount: hide the field (rendered
    // conditionally below) and keep the submitted value at 0.
    useEffect(() => {
        if (amountType === 'variable') {
            form.setValue('amount', '0');
            form.clearErrors('amount');
            return;
        }

        // Clicking the already-selected "Fixed" option toggles the combobox off,
        // which sets amountType to undefined. Fall back to "fixed" so the amount
        // field does not disappear.
        if (amountType !== 'fixed') {
            form.setValue('amountType', 'fixed');
        }

        if (form.getValues('amount') === '0') {
            form.setValue('amount', '');
        }
    }, [amountType, form]);

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
                                    name="amountType"
                                    label="Amount Type"
                                    options={FIXED_EXPENSE_AMOUNT_TYPE_OPTIONS}
                                    placeholder="Select amount type"
                                />

                                <div className={amountType === 'variable' ? 'invisible' : ''}>
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
                                </div>

                                <SelectField
                                    control={form.control}
                                    name="type"
                                    label="Type"
                                    options={FIXED_EXPENSE_TYPE_OPTIONS}
                                    placeholder="Select expense type"
                                />

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

                            <div className="space-y-2">
                                <Label>Payment Mode</Label>
                                <RadioGroup
                                    value={paymentMode}
                                    onValueChange={(value) => {
                                        const mode = value as FixedExpenseFormValues['paymentMode'];
                                        form.setValue('paymentMode', mode, { shouldValidate: true });

                                        if (mode === 'auto_debit') {
                                            form.setValue('selectedBeneficiaryId', '');
                                            form.setValue('accountName', '');
                                            form.setValue('accountNumber', '');
                                            form.setValue('ifscCode', '');
                                            form.clearErrors([
                                                'accountName',
                                                'accountNumber',
                                                'ifscCode',
                                            ]);
                                        }
                                    }}
                                    className="flex gap-6"
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem
                                            value="auto_debit"
                                            id="fixed-expense-auto-debit"
                                        />
                                        <Label
                                            htmlFor="fixed-expense-auto-debit"
                                            className="cursor-pointer font-normal"
                                        >
                                            Auto Debit
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem
                                            value="bank_transfer"
                                            id="fixed-expense-bank-transfer"
                                        />
                                        <Label
                                            htmlFor="fixed-expense-bank-transfer"
                                            className="cursor-pointer font-normal"
                                        >
                                            Bank Transfer
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {isBankTransfer && (
                                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                                    <h4 className="flex items-center gap-2 text-md font-semibold">
                                        <Landmark className="h-4 w-4" />
                                        Beneficiary Details
                                    </h4>

                                    <div className="flex items-end gap-4">
                                        <div className="w-72">
                                            <SelectField
                                                control={form.control}
                                                name="selectedBeneficiaryId"
                                                label="Beneficiary (Master)"
                                                options={beneficiaryOptions}
                                                placeholder="Select beneficiary..."
                                            />
                                        </div>

                                        <Dialog
                                            open={isAddBeneficiaryOpen}
                                            onOpenChange={setIsAddBeneficiaryOpen}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    type="button"
                                                    className="mb-1"
                                                >
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                    Add New
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add New Beneficiary</DialogTitle>
                                                    <DialogDescription>
                                                        Save beneficiary bank details for future use
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-1">
                                                        <Label>
                                                            Beneficiary Name{' '}
                                                            <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            value={newBeneficiary.name}
                                                            onChange={(e) =>
                                                                setNewBeneficiary((prev) => ({
                                                                    ...prev,
                                                                    name: e.target.value,
                                                                }))
                                                            }
                                                            placeholder="Enter beneficiary name"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>
                                                            Account Number{' '}
                                                            <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            value={newBeneficiary.accountNumber}
                                                            onChange={(e) =>
                                                                setNewBeneficiary((prev) => ({
                                                                    ...prev,
                                                                    accountNumber: e.target.value,
                                                                }))
                                                            }
                                                            placeholder="Enter account number"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>
                                                            IFSC Code{' '}
                                                            <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            value={newBeneficiary.ifsc}
                                                            onChange={(e) =>
                                                                setNewBeneficiary((prev) => ({
                                                                    ...prev,
                                                                    ifsc: e.target.value.toUpperCase(),
                                                                }))
                                                            }
                                                            placeholder="e.g. SBIN0001234"
                                                            className="font-mono"
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button
                                                        variant="outline"
                                                        type="button"
                                                        onClick={() => setIsAddBeneficiaryOpen(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={handleAddBeneficiary}
                                                        disabled={
                                                            createBeneficiaryMutation.isPending ||
                                                            !newBeneficiary.name ||
                                                            !newBeneficiary.accountNumber ||
                                                            !newBeneficiary.ifsc
                                                        }
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Add
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                    </div>
                                </div>
                            )}

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
