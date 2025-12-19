import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, AlertCircle, Percent, IndianRupee } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useEffect } from 'react';
import { useSubmitCostingSheet, useUpdateCostingSheet } from '@/hooks/api/useCostingSheets';
import type { TenderCostingSheet } from '@/types/api.types';
import { formatDateTime } from '@/hooks/useFormatedDate';

const CostingSheetFormSchema = z.object({
    tenderId: z.number().min(1, 'Tender ID is required'),
    submittedFinalPrice: z.string().min(1, 'Final price is required'),
    submittedReceiptPrice: z.string().min(1, 'Receipt price is required'),
    submittedBudgetPrice: z.string().min(1, 'Budget price is required'),
    submittedGrossMargin: z.string(),
    teRemarks: z.string().min(1, 'Remarks are required'),
});

type FormValues = z.infer<typeof CostingSheetFormSchema>;

interface CostingSheetSubmitFormProps {
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
    };
    mode: 'submit' | 'edit' | 'resubmit';
    existingData?: TenderCostingSheet;
}

export default function CostingSheetSubmitForm({
    tenderId,
    tenderDetails,
    mode,
    existingData
}: CostingSheetSubmitFormProps) {
    const navigate = useNavigate();
    const submitMutation = useSubmitCostingSheet();
    const updateMutation = useUpdateCostingSheet();

    const form = useForm<FormValues>({
        resolver: zodResolver(CostingSheetFormSchema),
        defaultValues: {
            tenderId: tenderId,
            submittedFinalPrice: '',
            submittedReceiptPrice: '',
            submittedBudgetPrice: '',
            submittedGrossMargin: '0.00',
            teRemarks: '',
        },
    });

    const receiptPrice = form.watch('submittedReceiptPrice');
    const budgetPrice = form.watch('submittedBudgetPrice');

    // Auto-calculate gross margin
    useEffect(() => {
        const receipt = parseFloat(receiptPrice) || 0;
        const budget = parseFloat(budgetPrice) || 0;

        if (budget > 0) {
            const margin = ((budget - receipt) / budget) * 100;
            form.setValue('submittedGrossMargin', margin.toFixed(2));
        } else {
            form.setValue('submittedGrossMargin', '0.00');
        }
    }, [receiptPrice, budgetPrice, form]);

    // Populate form with existing data when available
    useEffect(() => {
        if (existingData) {
            // For edit and resubmit modes, always populate
            // For submit mode, populate if sheet exists (even if not submitted yet)
            if (mode === 'edit' || mode === 'resubmit' ||
                (mode === 'submit' && existingData.id)) {
                form.reset({
                    tenderId: tenderId,
                    submittedFinalPrice: existingData.submittedFinalPrice || '',
                    submittedReceiptPrice: existingData.submittedReceiptPrice || '',
                    submittedBudgetPrice: existingData.submittedBudgetPrice || '',
                    submittedGrossMargin: existingData.submittedGrossMargin || '0.00',
                    teRemarks: existingData.teRemarks || '',
                });
            }
        }
    }, [existingData, form, tenderId, mode]);

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            // Determine if we should use submit (create) or update
            // Update if: edit/resubmit mode OR submit mode with existing sheet
            const shouldUpdate = existingData?.id && (
                mode === 'edit' ||
                mode === 'resubmit' ||
                (mode === 'submit' && existingData.status &&
                    ['Created', 'Pending', 'Submitted', 'Rejected/Redo'].includes(existingData.status))
            );

            if (shouldUpdate && existingData?.id) {
                // Update existing costing sheet
                await updateMutation.mutateAsync({
                    id: existingData.id,
                    data: {
                        submittedFinalPrice: data.submittedFinalPrice,
                        submittedReceiptPrice: data.submittedReceiptPrice,
                        submittedBudgetPrice: data.submittedBudgetPrice,
                        submittedGrossMargin: data.submittedGrossMargin,
                        teRemarks: data.teRemarks,
                    },
                });
            } else {
                // Create new costing sheet (submit mode with no existing sheet)
                await submitMutation.mutateAsync(data);
            }
            // Navigation happens automatically via mutation success callbacks
            navigate(paths.tendering.costingSheets);
        } catch (error) {
            // Error handling is done by mutation hooks (toast notifications)
            // Just log for debugging
            console.error('Error submitting costing sheet:', error);
            // Don't navigate on error - let user see the error and retry
        }
    };

    const getTitle = () => {
        if (mode === 'submit') return 'Submit Costing Sheet';
        if (mode === 'edit') return 'Edit Costing Sheet';
        return 'Re-submit Costing Sheet';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{getTitle()}</CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'submit' && 'Submit costing details for this tender'}
                            {mode === 'edit' && 'Update costing sheet information'}
                            {mode === 'resubmit' && 'Re-submit after addressing rejection feedback'}
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Rejection Reason - Only for resubmit */}
                        {mode === 'resubmit' && existingData?.rejectionReason && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Rejection Reason:</strong> {existingData.rejectionReason}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Tender Basic Details */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Tender Information
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tender No</p>
                                    <p className="text-base font-semibold">{tenderDetails.tenderNo}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Team Member</p>
                                    <p className="text-base font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Tender Name</p>
                                    <p className="text-base font-semibold">{tenderDetails.tenderName}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                                    <p className="text-base font-semibold">
                                        {tenderDetails.dueDate ? formatDateTime(tenderDetails.dueDate) : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Costing Details */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Costing Details
                            </h4>

                            <div className="grid gap-4 md:grid-cols-2">
                                <FieldWrapper
                                    control={form.control}
                                    name="submittedFinalPrice"
                                    label="Final Price (GST Inclusive)"
                                >
                                    {(field) => (
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                {...field}
                                                type="number"
                                                step="0.01"
                                                className="pl-10"
                                                placeholder="Enter final price"
                                            />
                                        </div>
                                    )}
                                </FieldWrapper>

                                <FieldWrapper
                                    control={form.control}
                                    name="submittedReceiptPrice"
                                    label="Receipt (Pre GST)"
                                >
                                    {(field) => (
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                {...field}
                                                type="number"
                                                step="0.01"
                                                className="pl-10"
                                                placeholder="Enter receipt price"
                                            />
                                        </div>
                                    )}
                                </FieldWrapper>

                                <FieldWrapper
                                    control={form.control}
                                    name="submittedBudgetPrice"
                                    label="Budget (Pre GST)"
                                >
                                    {(field) => (
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                {...field}
                                                type="number"
                                                step="0.01"
                                                className="pl-10"
                                                placeholder="Enter budget price"
                                            />
                                        </div>
                                    )}
                                </FieldWrapper>

                                <FieldWrapper
                                    control={form.control}
                                    name="submittedGrossMargin"
                                    label="Gross Margin %"
                                >
                                    {(field) => (
                                        <div className="relative">
                                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                {...field}
                                                type="text"
                                                className="pl-10 bg-muted"
                                                placeholder="Auto-calculated"
                                                readOnly
                                            />
                                        </div>
                                    )}
                                </FieldWrapper>
                            </div>

                            <FieldWrapper
                                control={form.control}
                                name="teRemarks"
                                label="Remarks"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        rows={4}
                                        placeholder="Enter any additional remarks or notes"
                                    />
                                )}
                            </FieldWrapper>
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
                                onClick={() => form.reset()}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'submit' && 'Submit'}
                                {mode === 'edit' && 'Update'}
                                {mode === 'resubmit' && 'Resubmit'} Costing Sheet
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
