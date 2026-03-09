import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Save, IndianRupee, ArrowLeft } from 'lucide-react';
import { TdsRecoveredFormSchema, type TdsRecoveredFormValues } from '../helpers/loanAdvance.schema';
import { useCreateTdsRecovery } from '@/hooks/api/useLoanAdvance';
import DateInput from '@/components/form/DateInput';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { formatINR } from '@/hooks/useINRFormatter';

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
                    tdsDocument: values.tdsDocument,
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

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IndianRupee className="h-5 w-5" />
                        <CardTitle className="text-lg">Record TDS Recovery</CardTitle>
                    </div>
                    {onCancel && (
                        <Button variant="outline" size="sm" onClick={onCancel}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                    )}
                </div>
                <CardDescription>
                    Remaining TDS to Recover: <span className="font-semibold text-green-700">{formatINR(Number(totalTdsToRecover))}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
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
                                />
                            </div>
                        </div>

                        {/* Bank Transaction Details */}
                        <FieldWrapper
                            control={form.control}
                            name="tdsRecoveryBankDetails"
                            label="TDS Recovery Bank Transaction Details"
                        >
                            {(field) => (<textarea
                                className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                placeholder="TDS Recovery Bank Transaction Details"
                                maxLength={200}
                                {...field}
                            />)}
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
