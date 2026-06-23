import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, XCircle } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useRejectCosting } from '@/hooks/api/useCostingApprovals';
import type { CostingSheetWithDetails } from '@/modules/tendering/costing-approvals/helpers/costingApproval.types';
import { formatINR } from '@/hooks/useINRFormatter';

const CostingRejectionFormSchema = z.object({
    rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

type FormValues = z.infer<typeof CostingRejectionFormSchema>;

interface CostingRejectionFormProps {
    costingSheet: CostingSheetWithDetails;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
    };
}

export default function CostingRejectionForm({
    costingSheet,
    tenderDetails,
}: CostingRejectionFormProps) {
    const navigate = useNavigate();
    const rejectMutation = useRejectCosting();

    const form = useForm<FormValues>({
        resolver: zodResolver(CostingRejectionFormSchema),
        defaultValues: {
            rejectionReason: '',
        },
    });

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            await rejectMutation.mutateAsync({
                id: costingSheet.id,
                data: { rejectionReason: data.rejectionReason },
            });
            navigate(paths.tendering.costingApprovals);
        } catch (error) {
            console.error('Error rejecting costing:', error);
        }
    };

    const submittedDetails = costingSheet.details.filter(d => d.status === 'Submitted');

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-destructive">Reject Costing Sheet</CardTitle>
                        <CardDescription className="mt-2">
                            Provide a detailed reason for rejecting this costing sheet.
                            {submittedDetails.length > 0 && (
                                <span className="block mt-1 text-muted-foreground">
                                    This will reject all {submittedDetails.length} pending detail{submittedDetails.length !== 1 ? 's' : ''}.
                                </span>
                            )}
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
                            </div>
                        </div>

                        {/* Submitted Details Summary */}
                        {submittedDetails.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Submitted Costing Details ({submittedDetails.length})
                                </h4>
                                {submittedDetails.map((detail, idx) => (
                                    <div key={detail.id} className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                        <h5 className="font-semibold text-sm mb-3">
                                            {detail.detailName || detail.categoryName || `Detail #${idx + 1}`}
                                        </h5>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Final Price</p>
                                                <p className="font-bold text-blue-700 dark:text-blue-300">
                                                    {detail.submittedFinalPrice
                                                        ? formatINR(parseFloat(detail.submittedFinalPrice))
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Receipt</p>
                                                <p className="font-bold text-blue-700 dark:text-blue-300">
                                                    {detail.submittedReceiptPrice
                                                        ? formatINR(parseFloat(detail.submittedReceiptPrice))
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Budget</p>
                                                <p className="font-bold text-blue-700 dark:text-blue-300">
                                                    {detail.submittedBudgetPrice
                                                        ? formatINR(parseFloat(detail.submittedBudgetPrice))
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>
                                        {detail.teRemarks && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium text-muted-foreground mb-1">TE Remarks</p>
                                                <p className="text-sm text-muted-foreground">{detail.teRemarks}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Rejection Reason */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-destructive border-b pb-2">
                                Rejection Reason
                            </h4>

                            <FieldWrapper
                                control={form.control}
                                name="rejectionReason"
                                label="Reason for Rejection"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        rows={6}
                                        placeholder="Provide a detailed explanation for why this costing is being rejected..."
                                        className="border-destructive focus:ring-destructive"
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
                                type="submit"
                                disabled={isSubmitting}
                                variant="destructive"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject All Pending Details
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
