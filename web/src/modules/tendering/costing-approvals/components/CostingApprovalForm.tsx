import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, IndianRupee, Percent } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useEffect } from 'react';
import { useApproveCosting, useUpdateApprovedCosting } from '@/hooks/api/useCostingApprovals';
import type { TenderCostingSheet } from '@/modules/tendering/costing-sheets/helpers/costingSheet.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import { formatINR } from '@/hooks/useINRFormatter';
import type { VendorOrganization } from '@/types/api.types';

// Schema for form values (MultiSelectField returns strings)
const CostingApprovalFormSchema = z.object({
    finalPrice: z.string().min(1, 'Final price is required'),
    receiptPrice: z.string().min(1, 'Receipt price is required'),
    budgetPrice: z.string().min(1, 'Budget price is required'),
    grossMargin: z.string(),
    oemVendorIds: z.array(z.string()).min(1, 'At least one vendor must be selected'),
    tlRemarks: z.string().min(1, 'Remarks are required'),
});

type FormValues = z.infer<typeof CostingApprovalFormSchema>;

interface CostingApprovalFormProps {
    costingSheet: TenderCostingSheet;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
    };
    mode: 'approve' | 'edit';
}

export default function CostingApprovalForm({
    costingSheet,
    tenderDetails,
    mode
}: CostingApprovalFormProps) {
    const navigate = useNavigate();
    const approveMutation = useApproveCosting();
    const updateMutation = useUpdateApprovedCosting();
    const { data: vendors } = useVendorOrganizations();

    const vendorOptions = vendors?.map((v: VendorOrganization) => ({
        value: v.id.toString(),
        label: v.name,
    })) || [];

    // Determine default values based on mode
    // Note: MultiSelectField works with strings, so we convert numbers to strings
    const getDefaultValues = () => {
        if (mode === 'edit') {
            // In edit mode, use approved values
            return {
                finalPrice: costingSheet.finalPrice || '',
                receiptPrice: costingSheet.receiptPrice || '',
                budgetPrice: costingSheet.budgetPrice || '',
                grossMargin: costingSheet.grossMargin || '0.00',
                oemVendorIds: (costingSheet.oemVendorIds || []).map(id => id.toString()),
                tlRemarks: costingSheet.tlRemarks || '',
            };
        } else {
            // In approve mode, use submitted values as starting point
            return {
                finalPrice: costingSheet.submittedFinalPrice || '',
                receiptPrice: costingSheet.submittedReceiptPrice || '',
                budgetPrice: costingSheet.submittedBudgetPrice || '',
                grossMargin: costingSheet.submittedGrossMargin || '0.00',
                oemVendorIds: [],
                tlRemarks: '',
            };
        }
    };

    const defaultValues = getDefaultValues();

    const form = useForm<FormValues>({
        resolver: zodResolver(CostingApprovalFormSchema),
        defaultValues,
    });

    const receiptPrice = form.watch('receiptPrice');
    const budgetPrice = form.watch('budgetPrice');

    // Auto-calculate gross margin
    useEffect(() => {
        const receipt = parseFloat(receiptPrice) || 0;
        const budget = parseFloat(budgetPrice) || 0;

        // grossMargin = receipt > 0 ? ((receipt - budget) / receipt) * 100 : 0;
        if (receipt > 0) {
            const margin = ((receipt - budget) / receipt) * 100;
            form.setValue('grossMargin', margin.toFixed(2));
        } else {
            form.setValue('grossMargin', '0.00');
        }
    }, [receiptPrice, budgetPrice, form]);

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            // Transform form data: convert string vendor IDs to numbers
            const transformedData = {
                ...data,
                oemVendorIds: data.oemVendorIds.map(id => Number(id)),
            };

            if (mode === 'approve') {
                await approveMutation.mutateAsync({
                    id: costingSheet.id,
                    data: transformedData,
                });
            } else {
                await updateMutation.mutateAsync({
                    id: costingSheet.id,
                    data: transformedData,
                });
            }
            navigate(paths.tendering.costingApprovals);
        } catch (error) {
            console.error('Error processing approval:', error);
            // Error toast is handled by the mutation hooks
        }
    };

    const onError = (errors: any) => {
        console.error('Form validation errors:', errors);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === 'approve' ? 'Approve Costing Sheet' : 'Edit Approved Costing'}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'approve'
                                ? 'Review and approve the costing details submitted by the team engineer'
                                : 'Update the approved costing details'}
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
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
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

                        {/* Side-by-Side Comparison */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Costing Details Comparison
                            </h4>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left Side - TE Submitted Values (Read-only) */}
                                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                        <h5 className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                                            TE Submitted Values
                                        </h5>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {costingSheet.submittedFinalPrice
                                                ? formatINR(parseFloat(costingSheet.submittedFinalPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Receipt (Pre GST)</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {costingSheet.submittedReceiptPrice
                                                ? formatINR(parseFloat(costingSheet.submittedReceiptPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Budget (Pre GST)</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {costingSheet.submittedBudgetPrice
                                                ? formatINR(parseFloat(costingSheet.submittedBudgetPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {costingSheet.submittedGrossMargin
                                                ? `${costingSheet.submittedGrossMargin}%`
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">TE Remarks</p>
                                        <p className="text-sm text-muted-foreground">
                                            {costingSheet.teRemarks || '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side - TL Approval Values (Editable) */}
                                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                        <h5 className="font-semibold text-sm text-green-700 dark:text-green-300">
                                            TL Approved Values
                                        </h5>
                                    </div>

                                    <FieldWrapper
                                        control={form.control}
                                        name="finalPrice"
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
                                        name="receiptPrice"
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
                                        name="budgetPrice"
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
                                        name="grossMargin"
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
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {/* OEM/Vendor Selection */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Vendor Selection
                                </h4>
                                <MultiSelectField
                                    control={form.control}
                                    name="oemVendorIds"
                                    label="OEM/Vendor Organizations"
                                    options={vendorOptions}
                                    placeholder="Select vendors"
                                />
                            </div>
                            {/* TL Remarks */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    TL Remarks
                                </h4>
                                <FieldWrapper
                                    control={form.control}
                                    name="tlRemarks"
                                    label="Remarks"
                                >
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            rows={4}
                                            placeholder="Enter your remarks about this costing approval"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
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
                                onClick={() => form.reset(defaultValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                variant="default"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'approve' ? 'Approve' : 'Update'} Costing
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
