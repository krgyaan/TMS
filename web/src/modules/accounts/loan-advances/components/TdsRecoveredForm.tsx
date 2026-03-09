import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, X, IndianRupee } from 'lucide-react';
import { TdsRecoveredFormSchema, type TdsRecoveredFormValues } from '../helpers/loanAdvance.schema';
import { useCreateTdsRecovery } from '@/hooks/api/useLoanAdvance';
import DateInput from '@/components/form/DateInput';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { formatCurrency } from '../helpers/loanAdvance.mappers';

interface TdsRecoveredFormProps {
    loanId: number;
    totalTdsToRecover: string | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function TdsRecoveredForm({
    loanId,
    totalTdsToRecover,
    onSuccess,
    onCancel,
}: TdsRecoveredFormProps) {
    const createTdsRecoveryMutation = useCreateTdsRecovery();

    const form = useForm<TdsRecoveredFormValues>({
        resolver: zodResolver(TdsRecoveredFormSchema),
        defaultValues: {
            tdsAmount: '',
            tdsDocument: [],
            tdsDate: new Date().toISOString().split('T')[0],
            tdsRecoveryBankDetails: '',
        },
    });

    const tdsDocument = useWatch({ control: form.control, name: 'tdsDocument' });
    const isSubmitting = createTdsRecoveryMutation.isPending;

    const handleSubmit: SubmitHandler<TdsRecoveredFormValues> = async (values) => {
        try {
            await createTdsRecoveryMutation.mutateAsync({
                loanId,
                data: {
                    tdsAmount: values.tdsAmount,
                    tdsDocument: values.tdsDocument.length > 0 ? values.tdsDocument : null,
                    tdsDate: values.tdsDate,
                    tdsRecoveryBankDetails: values.tdsRecoveryBankDetails || null,
                },
            });
            form.reset();
            onSuccess?.();
        } catch (error) {
            console.error('Error submitting TDS recovery:', error);
        }
    };

    const remainingTds = parseFloat(totalTdsToRecover ?? '0');

    return (
        <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IndianRupee className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-lg text-green-800">Record TDS Recovery</CardTitle>
                    </div>
                    {onCancel && (
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <CardDescription>
                    Remaining TDS to Recover: <span className="font-semibold text-green-700">{formatCurrency(totalTdsToRecover)}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {/* TDS Amount Recovered */}
                            <FieldWrapper
                                control={form.control}
                                name="tdsAmount"
                                label="TDS Amount Recovered (₹)"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={remainingTds}
                                        placeholder="Enter TDS amount"
                                    />
                                )}
                            </FieldWrapper>

                            {/* TDS Recovery Date */}
                            <FieldWrapper
                                control={form.control}
                                name="tdsDate"
                                label="TDS Recovery Date"
                            >
                                {(field) => <DateInput {...field} />}
                            </FieldWrapper>

                            {/* TDS Return Document */}
                            <div className="md:col-span-2 lg:col-span-1">
                                <TenderFileUploader
                                    context="tdsDocument"
                                    value={tdsDocument}
                                    onChange={(paths) => form.setValue('tdsDocument', paths)}
                                    label="Upload TDS Return Document"
                                    disabled={isSubmitting}
                                    maxFiles={5}
                                />
                            </div>
                        </div>

                        {/* Bank Transaction Details */}
                        <FieldWrapper
                            control={form.control}
                            name="tdsRecoveryBankDetails"
                            label="TDS Recovery Bank Transaction Details"
                        >
                            {(field) => (
                                <Textarea
                                    {...field}
                                    placeholder="Enter bank transaction details (Account No, Transaction ID, etc.)"
                                    rows={3}
                                />
                            )}
                        </FieldWrapper>

                        <div className="flex justify-end gap-2 pt-4">
                            {onCancel && (
                                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-green-500 hover:bg-green-600 text-white"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Record TDS Recovery
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default TdsRecoveredForm;
