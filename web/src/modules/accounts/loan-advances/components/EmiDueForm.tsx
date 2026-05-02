import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Save, CalendarClock, ArrowLeft } from 'lucide-react';
import { EmiDueFormSchema, type EmiDueFormValues } from '../helpers/loanAdvance.schema';
import { useCreateEmi } from '@/hooks/api/useLoanAdvance';
import DateInput from '@/components/form/DateInput';
import { formatINR } from '@/hooks/useINRFormatter';

interface EmiDueFormProps {
    loanId: number;
    loanAmount: string;
    principleOutstanding: string | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function EmiDueForm({
    loanId,
    loanAmount,
    principleOutstanding,
    onSuccess,
    onCancel,
}: EmiDueFormProps) {
    const createEmiMutation = useCreateEmi();

    const form = useForm<EmiDueFormValues>({
        resolver: zodResolver(EmiDueFormSchema) as Resolver<EmiDueFormValues>,
        defaultValues: {
            emiDate: new Date().toISOString().split('T')[0],
            principlePaid: '',
            interestPaid: '',
            tdsToBeRecovered: '0',
            penalChargesPaid: '0',
        },
    });

    const isSubmitting = createEmiMutation.isPending;

    const handleSubmit: SubmitHandler<EmiDueFormValues> = async (values) => {
        try {
            await createEmiMutation.mutateAsync({
                loanId,
                data: {
                    emiDate: values.emiDate,
                    principlePaid: values.principlePaid || '0',
                    interestPaid: values.interestPaid || '0',
                    tdsToBeRecovered: values.tdsToBeRecovered || '0',
                    penalChargesPaid: values.penalChargesPaid || '0',
                },
            });
            form.reset();
            onSuccess?.();
        } catch (error) {
            console.error('Error submitting EMI:', error);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-orange-600" />
                        <CardTitle className="text-lg">Record EMI Payment</CardTitle>
                    </div>
                    {onCancel && (
                        <Button variant="outline" size="sm" onClick={onCancel}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                    )}
                </div>
                <CardDescription>
                    Outstanding Principal: <span className="font-semibold text-orange-700">{formatINR(Number(principleOutstanding))}</span>
                    {' | '}
                    Loan Amount: <span className="font-semibold">{formatINR(loanAmount)}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {/* EMI Payment Date */}
                            <FieldWrapper
                                control={form.control}
                                name="emiDate"
                                label="EMI Payment Date"
                            >
                                {(field) => <DateInput {...field} />}
                            </FieldWrapper>

                            {/* Principle Paid */}
                            <FieldWrapper
                                control={form.control}
                                name="principlePaid"
                                label="Principle Paid (₹)"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Enter principal amount"
                                    />
                                )}
                            </FieldWrapper>

                            {/* Interest Paid */}
                            <FieldWrapper
                                control={form.control}
                                name="interestPaid"
                                label="Interest Paid (₹)"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Enter interest amount"
                                    />
                                )}
                            </FieldWrapper>

                            {/* TDS to be Recovered */}
                            <FieldWrapper
                                control={form.control}
                                name="tdsToBeRecovered"
                                label="TDS to be Recovered (₹)"
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

                            {/* Penal Charges Paid */}
                            <FieldWrapper
                                control={form.control}
                                name="penalChargesPaid"
                                label="Penal Charges Paid (₹)"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Enter penal charges"
                                    />
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            {onCancel && (
                                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Record EMI Payment
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default EmiDueForm;
