import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Save, X, FileCheck, AlertTriangle } from 'lucide-react';
import { LoanClosureFormSchema, type LoanClosureFormValues } from '../helpers/loanAdvance.schema';
import { useCloseLoanAdvance } from '@/hooks/api/useLoanAdvance';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LoanAdvanceResponse } from '../helpers/loanAdvance.types';

interface LoanClosureFormProps {
    loan: LoanAdvanceResponse;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function LoanClosureForm({ loan, onSuccess, onCancel }: LoanClosureFormProps) {
    const closeLoanMutation = useCloseLoanAdvance();

    const requiresMcaClosure = loan.chargeMcaWebsite === 'Yes';

    const form = useForm<LoanClosureFormValues>({
        resolver: zodResolver(LoanClosureFormSchema),
        defaultValues: {
            bankNocDocument: loan.bankNocDocument ?? [],
            closureCreatedMca: loan.closureCreatedMca ?? [],
        },
    });

    const bankNocDocument = useWatch({ control: form.control, name: 'bankNocDocument' }) ?? [];
    const closureCreatedMca = useWatch({ control: form.control, name: 'closureCreatedMca' }) ?? [];

    const isSubmitting = closeLoanMutation.isPending;

    const handleSubmit: SubmitHandler<LoanClosureFormValues> = async (values) => {
        // Validate MCA closure document if required
        if (requiresMcaClosure && (!values.closureCreatedMca || values.closureCreatedMca.length === 0)) {
            form.setError('closureCreatedMca', {
                type: 'manual',
                message: 'MCA closure document is required since charge was created on MCA website',
            });
            return;
        }

        try {
            await closeLoanMutation.mutateAsync({
                id: loan.id,
                data: {
                    bankNocDocument: values.bankNocDocument?.length ? values.bankNocDocument : null,
                    closureCreatedMca: values.closureCreatedMca?.length ? values.closureCreatedMca : null
                },
            });
            form.reset();
            onSuccess?.();
        } catch (error) {
            console.error('Error closing loan:', error);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5" />
                        <CardTitle className="text-lg">Close Loan</CardTitle>
                    </div>
                    {onCancel && (
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <CardDescription>
                    Upload required documents to close the loan for {loan.bankName}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Warning if MCA Closure required */}
                        {requiresMcaClosure && (
                            <Alert className="border-amber-200 bg-amber-50">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-800">
                                    This loan has a charge created on MCA website. You must upload the MCA closure document.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Bank NOC Document */}
                            <div>
                                <TenderFileUploader
                                    context="bankNoc"
                                    value={bankNocDocument}
                                    onChange={(paths) => form.setValue('bankNocDocument', paths)}
                                    label="Upload Bank NOC Document *"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* MCA Closure Document (only if charge created on MCA) */}
                            {requiresMcaClosure && (
                                <div>
                                    <TenderFileUploader
                                        context="mcaClosure"
                                        value={closureCreatedMca}
                                        onChange={(paths) => form.setValue('closureCreatedMca', paths)}
                                        label="Upload MCA Closure Document *"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            {onCancel && (
                                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={isSubmitting || bankNocDocument.length === 0}
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Close Loan
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default LoanClosureForm;
