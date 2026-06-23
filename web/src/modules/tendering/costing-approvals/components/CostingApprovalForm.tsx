import { paths } from '@/app/routes/paths';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useApproveAllCosting, useApproveCosting, useRejectCosting, useUpdateApprovedCosting } from '@/hooks/api/useCostingApprovals';
import { costingApprovalsKey } from '@/hooks/api/useCostingApprovals';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { MultiDetailFormSchema } from '@/modules/tendering/costing-approvals/helpers/costingApproval.schema';
import type { CostingSheetWithDetails } from '@/modules/tendering/costing-approvals/helpers/costingApproval.types';
import type { VendorOrganization } from '@/types/api.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle, Save, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { type SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import CostingApprovalRejectDialog from './CostingApprovalRejectDialog';
import SentRfqsResponsesHistory from './SentRfqsResponsesHistory';

type MultiDetailFormValues = z.infer<typeof MultiDetailFormSchema>;

interface CostingApprovalFormProps {
    costingSheet: CostingSheetWithDetails;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
        rfqRequired?: string | null;
    };
    mode: 'approve' | 'edit';
}

export default function CostingApprovalForm({
    costingSheet,
    tenderDetails,
    mode,
}: CostingApprovalFormProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const approveDetailMutation = useApproveCosting();
    const approveAllMutation = useApproveAllCosting();
    const rejectMutation = useRejectCosting();
    const updateDetailMutation = useUpdateApprovedCosting();
    const { data: vendors } = useVendorOrganizations();

    const vendorOptions = vendors?.map((v: VendorOrganization) => ({
        value: v.id.toString(),
        label: v.name,
    })) || [];

    const relevantDetails = mode === 'edit'
        ? costingSheet.details.filter(d => d.status === 'Approved')
        : costingSheet.details.filter(d => d.status === 'Submitted');

    const [processedIds, setProcessedIds] = useState<Set<number>>(new Set());

    const refreshData = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: costingApprovalsKey.detail(costingSheet.id) });
    }, [queryClient, costingSheet.id]);

    const isRelevantProcessed = (detailId: number) => processedIds.has(detailId);
    const allRelevantProcessed = relevantDetails.every(d => isRelevantProcessed(d.id));
    const hasAnyPending = relevantDetails.some(d => !isRelevantProcessed(d.id));

    const buildDefaultValues = (detail: CostingSheetWithDetails['details'][number]) => {
        if (mode === 'edit') {
            return {
                detailId: detail.id,
                finalPrice: detail.finalPrice || '',
                receiptPrice: detail.receiptPrice || '',
                budgetPrice: detail.budgetPrice || '',
                grossMargin: detail.grossMargin || '0.00',
                tlRemarks: detail.tlRemarks || '',
            };
        }
        return {
            detailId: detail.id,
            finalPrice: detail.submittedFinalPrice || '',
            receiptPrice: detail.submittedReceiptPrice || '',
            budgetPrice: detail.submittedBudgetPrice || '',
            grossMargin: detail.submittedGrossMargin || '0.00',
            tlRemarks: '',
        };
    };

    const defaultValues: MultiDetailFormValues = {
        oemVendorIds: mode === 'edit'
            ? (costingSheet.oemVendorIds || []).map(id => id.toString())
            : [],
        details: relevantDetails.map(buildDefaultValues),
    };

    const form = useForm<MultiDetailFormValues>({
        resolver: zodResolver(MultiDetailFormSchema),
        defaultValues,
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: 'details',
    });

    const handleGrossMarginChange = useCallback((index: number, receiptVal: string, budgetVal: string) => {
        const receipt = parseFloat(receiptVal) || 0;
        const budget = parseFloat(budgetVal) || 0;
        if (receipt > 0) {
            const margin = ((receipt - budget) / receipt) * 100;
            form.setValue(`details.${index}.grossMargin`, margin.toFixed(2));
        } else {
            form.setValue(`details.${index}.grossMargin`, '0.00');
        }
    }, [form]);

    const isSubmitting = form.formState.isSubmitting;

    const getSheetVendorIds = () =>
        form.getValues('oemVendorIds').map(Number);

    const submitIndividualApprove = async (index: number) => {
        const detail = form.getValues(`details.${index}`);
        try {
            await approveDetailMutation.mutateAsync({
                id: costingSheet.id,
                data: {
                    detailId: detail.detailId,
                    finalPrice: detail.finalPrice,
                    receiptPrice: detail.receiptPrice,
                    budgetPrice: detail.budgetPrice,
                    grossMargin: detail.grossMargin,
                    tlRemarks: detail.tlRemarks,
                    oemVendorIds: getSheetVendorIds(),
                },
            });
            setProcessedIds(prev => new Set(prev).add(detail.detailId));
            refreshData();
        } catch (error) {
            console.error('Error approving detail:', error);
        }
    };

    const submitIndividualUpdate = async (index: number) => {
        const detail = form.getValues(`details.${index}`);
        try {
            await updateDetailMutation.mutateAsync({
                id: costingSheet.id,
                data: {
                    detailId: detail.detailId,
                    finalPrice: detail.finalPrice,
                    receiptPrice: detail.receiptPrice,
                    budgetPrice: detail.budgetPrice,
                    grossMargin: detail.grossMargin,
                    tlRemarks: detail.tlRemarks,
                },
            });
            setProcessedIds(prev => new Set(prev).add(detail.detailId));
            refreshData();
        } catch (error) {
            console.error('Error updating detail:', error);
        }
    };

    const handleApproveAll: SubmitHandler<MultiDetailFormValues> = async (data) => {
        try {
            await approveAllMutation.mutateAsync({
                id: costingSheet.id,
                data: {
                    approvals: data.details.map(d => ({
                        detailId: d.detailId,
                        finalPrice: d.finalPrice,
                        receiptPrice: d.receiptPrice,
                        budgetPrice: d.budgetPrice,
                        grossMargin: d.grossMargin,
                        tlRemarks: d.tlRemarks,
                    })),
                    oemVendorIds: data.oemVendorIds.map(Number),
                },
            });
            data.details.forEach(d => {
                setProcessedIds(prev => new Set(prev).add(d.detailId));
            });
            navigate(paths.tendering.costingApprovals);
        } catch (error) {
            console.error('Error approving all:', error);
        }
    };

    const handleRejectAll = async () => {
        try {
            const pendingIds = relevantDetails.filter(d => !isRelevantProcessed(d.id)).map(d => d.id);
            for (const detailId of pendingIds) {
                await rejectMutation.mutateAsync({
                    id: costingSheet.id,
                    data: { detailId, rejectionReason: 'Bulk rejected by team lead' },
                });
                setProcessedIds(prev => new Set(prev).add(detailId));
            }
            refreshData();
        } catch (error) {
            console.error('Error rejecting all:', error);
        }
    };

    const onError = (errors: any) => {
        console.error('Form validation errors:', errors);
    };

    const [rejectDetailId, setRejectDetailId] = useState<number | null>(null);

    const handleRejectDialogSuccess = (detailId: number) => {
        setProcessedIds(prev => new Set(prev).add(detailId));
        setRejectDetailId(null);
        refreshData();
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {mode === 'approve' ? 'Approve Costing Sheet' : 'Edit Approved Costing'}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                {mode === 'approve'
                                    ? `Review and approve costing details submitted by the team engineer (${relevantDetails.length} detail${relevantDetails.length !== 1 ? 's' : ''})`
                                    : 'Update the approved costing details'}
                            </CardDescription>
                        </div>
                        <CardAction>
                            <Button variant="outline" onClick={() => navigate(paths.tendering.costingApprovals)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                        </CardAction>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleApproveAll, onError)} className="space-y-8">
                            {/* Tender Basic Details */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Tender Information
                                </h4>
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 bg-muted/30 p-4 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Tender No</p>
                                        <p className="text-base font-semibold">{tenderDetails.tenderNo}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Team Member</p>
                                        <p className="text-base font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                                    </div>
                                    <div>
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

                            {/* RFQ & Responses Details */}
                            <SentRfqsResponsesHistory tenderId={costingSheet.tenderId} rfqRequired={tenderDetails.rfqRequired} />

                            {/* Sheet-level Vendor Selection */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Vendor Selection (applies to all details)
                                </h4>
                                <MultiSelectField
                                    control={form.control}
                                    name="oemVendorIds"
                                    label="OEM/Vendor Organizations"
                                    options={vendorOptions}
                                    placeholder="Select vendors"
                                />
                            </div>

                            {/* Bulk Actions Header */}
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Costing Details ({relevantDetails.length})
                                </h4>
                                <div className="flex gap-2">
                                    {mode === 'approve' && hasAnyPending && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleRejectAll}
                                                disabled={isSubmitting}
                                            >
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Reject All
                                            </Button>
                                            {relevantDetails.length > 1 && (
                                                <Button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    variant="default"
                                                    size="sm"
                                                >
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Approve All
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Per-Detail Cards */}
                            {fields.map((field, index) => {
                                const detail = relevantDetails[index];
                                if (!detail) return null;
                                const processed = isRelevantProcessed(detail.id);

                                return (
                                    <div key={field.id} className={`border rounded-lg p-4 space-y-4 bg-white dark:bg-gray-950 ${processed ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-semibold text-sm flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-primary" />
                                                {detail.detailName || detail.categoryName || `Detail #${index + 1}`}
                                            </h5>
                                            {processed && (
                                                <Badge variant={mode === 'edit' ? 'default' : 'secondary'}>
                                                    {mode === 'edit' ? 'Updated' : 'Approved'}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Side-by-Side Comparison */}
                                        <div className="grid gap-6">
                                            {/* TE Submitted Values (Read-only) */}
                                            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3'>
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                                        <p className="font-bold text-blue-700 dark:text-blue-300">
                                                            {detail.submittedFinalPrice
                                                                ? formatINR(parseFloat(detail.submittedFinalPrice))
                                                                : '—'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Receipt (Pre GST)</p>
                                                        <p className="font-bold text-blue-700 dark:text-blue-300">
                                                            {detail.submittedReceiptPrice
                                                                ? formatINR(parseFloat(detail.submittedReceiptPrice))
                                                                : '—'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Budget (Pre GST)</p>
                                                        <p className="font-bold text-blue-700 dark:text-blue-300">
                                                            {detail.submittedBudgetPrice
                                                                ? formatINR(parseFloat(detail.submittedBudgetPrice))
                                                                : '—'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                                        <p className="font-bold text-blue-700 dark:text-blue-300">
                                                            {detail.submittedGrossMargin
                                                                ? `${detail.submittedGrossMargin}%`
                                                                : '—'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">TE Remarks</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {detail.teRemarks || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TL Approval Values */}
                                            {processed ? (
                                                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                                    <h6 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">TL Approved Values</h6>
                                                    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3'>
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                                            <p className="font-bold text-green-700 dark:text-green-300">
                                                                {detail.finalPrice ? formatINR(parseFloat(detail.finalPrice)) : '—'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Receipt (Pre GST)</p>
                                                            <p className="font-bold text-green-700 dark:text-green-300">
                                                                {detail.receiptPrice ? formatINR(parseFloat(detail.receiptPrice)) : '—'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Budget (Pre GST)</p>
                                                            <p className="font-bold text-green-700 dark:text-green-300">
                                                                {detail.budgetPrice ? formatINR(parseFloat(detail.budgetPrice)) : '—'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                                            <p className="font-bold text-green-700 dark:text-green-300">
                                                                {detail.grossMargin ? `${detail.grossMargin}%` : '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">TL Remarks</p>
                                                        <p className="text-sm text-muted-foreground">{detail.tlRemarks || '—'}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                                    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3'>
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`details.${index}.finalPrice`}
                                                            label="Final Price (GST Inclusive)"
                                                        >
                                                            {(field) => (
                                                                <Input
                                                                    {...field}
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Enter final price"
                                                                />
                                                            )}
                                                        </FieldWrapper>

                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`details.${index}.receiptPrice`}
                                                            label="Receipt (Pre GST)"
                                                        >
                                                            {(field) => (
                                                                <Input
                                                                    {...field}
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Enter receipt price"
                                                                    onChange={(e) => {
                                                                        field.onChange(e);
                                                                        handleGrossMarginChange(
                                                                            index,
                                                                            e.target.value,
                                                                            form.getValues(`details.${index}.budgetPrice`) || ''
                                                                        );
                                                                    }}
                                                                />
                                                            )}
                                                        </FieldWrapper>

                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`details.${index}.budgetPrice`}
                                                            label="Budget (Pre GST)"
                                                        >
                                                            {(field) => (
                                                                <Input
                                                                    {...field}
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Enter budget price"
                                                                    onChange={(e) => {
                                                                        field.onChange(e);
                                                                        handleGrossMarginChange(
                                                                            index,
                                                                            form.getValues(`details.${index}.receiptPrice`) || '',
                                                                            e.target.value
                                                                        );
                                                                    }}
                                                                />
                                                            )}
                                                        </FieldWrapper>

                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`details.${index}.grossMargin`}
                                                            label="Gross Margin %"
                                                        >
                                                            {(field) => (
                                                                <Input
                                                                    {...field}
                                                                    type="text"
                                                                    className="bg-muted"
                                                                    placeholder="Auto-calculated"
                                                                    readOnly
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </div>

                                                    <FieldWrapper
                                                        control={form.control}
                                                        name={`details.${index}.tlRemarks`}
                                                        label="TL Remarks"
                                                    >
                                                        {(field) => (
                                                            <Textarea
                                                                {...field}
                                                                rows={3}
                                                                placeholder="Enter remarks for this detail"
                                                            />
                                                        )}
                                                    </FieldWrapper>
                                                </div>
                                            )}
                                        </div>

                                        {/* Per-Detail Action Buttons */}
                                        {!processed && (
                                            <div className="flex justify-end gap-2 pt-2 border-t">
                                                {mode === 'approve' && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setRejectDetailId(detail.id)}
                                                        >
                                                            Reject Detail
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => submitIndividualApprove(index)}
                                                            disabled={isSubmitting}
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Approve Detail
                                                        </Button>
                                                    </>
                                                )}
                                                {mode === 'edit' && (
                                                    <Button
                                                        type="button"
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => submitIndividualUpdate(index)}
                                                        disabled={isSubmitting}
                                                    >
                                                        <Save className="mr-2 h-4 w-4" />
                                                        Update Detail
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Form Actions */}
                            <div className="flex justify-end gap-2 pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(paths.tendering.costingApprovals)}
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
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {rejectDetailId !== null && (
                <CostingApprovalRejectDialog
                    sheetId={costingSheet.id}
                    detailId={rejectDetailId}
                    open={rejectDetailId !== null}
                    onOpenChange={(open) => {
                        if (!open) setRejectDetailId(null);
                    }}
                    onSuccess={() => handleRejectDialogSuccess(rejectDetailId)}
                />
            )}
        </>
    );
}
