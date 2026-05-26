import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useMarkAsMissedGlobal, useGetValidMissedStatuses } from '@/hooks/api/useBidSubmissions';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { GlobalBidMissedFormSchema, type GlobalBidMissedFormValues } from '../helpers/bidSubmission.schema';
import { paths } from '@/app/routes/paths';
import type { GlobalMissedFormProps, TenderStage } from '../helpers/bidSubmission.types';

type FormValues = GlobalBidMissedFormValues;

const stageNameKeys: Record<TenderStage, string> = {
    "phy-doc": "Physical Docs",
    "rfq": "Request for Quote",
    "emd": "EMD",
    "checklist": "Checklists",
    "costing-sheet": "Costing Sheet",
    "costing-approval": "Costing Approval",
    "bid-submission" : "Bid Submission"
};

export default function GlobalBidMissedForm({
    tenderId,
    tenderDetails,
    existingData,
    stage
}: GlobalMissedFormProps) {
    const navigate = useNavigate();
    const markMissedGlobalMutation = useMarkAsMissedGlobal();
    
    // Fetch dynamic statuses based on the current stage
    const { data: validStatuses } = useGetValidMissedStatuses(stage);

    const form = useForm<FormValues>({
        resolver: zodResolver(GlobalBidMissedFormSchema),
        defaultValues: {
            tenderId: tenderId,
            preventionMeasures: '',
            tmsImprovements: '',
        },
    });

    useEffect(() => {
        if (existingData) {
            form.reset({
                tenderId: tenderId,
                preventionMeasures: existingData.preventionMeasures || '',
                tmsImprovements: existingData.tmsImprovements || '',
            });
        }
    }, [existingData, form, tenderId]);

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            await markMissedGlobalMutation.mutateAsync({
                tenderId: data.tenderId,
                rejectionStatus: data.rejectionStatus,
                preventionMeasures: data.preventionMeasures,
                // tmsImprovements: data.tmsImprovements,
            });
            // Map stages to their respective list page paths
            const stagePaths: Record<TenderStage, string> = {
                "phy-doc": paths.tendering.physicalDocs,
                "rfq": paths.tendering.rfqs,
                "emd": paths.tendering.emdsTenderFees,
                "checklist": paths.tendering.checklists,
                "costing-sheet": paths.tendering.costingSheets,
                "costing-approval": paths.tendering.costingApprovals,
                "bid-submission": paths.tendering.bidSubmissions,
            };

            const targetPath = stagePaths[stage];

            if (targetPath) {
                navigate(`${targetPath}?tab=tender-dnb`);
            } else {
                navigate(-1);
            }
        } catch (error) {
            console.error('Error marking as missed:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-destructive">
                            Mark Tender as DNB ({stageNameKeys[stage] || stage})
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Provide details and select a status for why this tender was missed during the {stageNameKeys[stage] || stage} stage
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
                        {/* Tender Information */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Tender Information
                            </h4>
                            <div className="grid gap-4 md:grid-cols-5 bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <p className="font-medium text-muted-foreground">Tender No</p>
                                    <p className="font-semibold">{tenderDetails.tenderNo}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-muted-foreground">Team Member</p>
                                    <p className="font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-medium text-muted-foreground">Tender Name</p>
                                    <p className="font-semibold">{tenderDetails.tenderName}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-muted-foreground">Due Date</p>
                                    <p className="font-semibold">
                                        {tenderDetails.dueDate ? formatDateTime(tenderDetails.dueDate) : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium text-muted-foreground">Final Costing</p>
                                    <p className="font-semibold text-green-600">
                                        {tenderDetails.finalCosting
                                            ? formatINR(parseFloat(tenderDetails.finalCosting))
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Missed Tender Details */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-destructive border-b pb-2">
                                Missed Tender Analysis
                            </h4>

                            <FieldWrapper
                                control={form.control}
                                name="rejectionStatus"
                                label={`Reason for Rejection / Missed`}
                            >
                                {(field) => (
                                    <Select
                                        onValueChange={(value) => field.onChange(parseInt(value, 10))}
                                        defaultValue={field.value?.toString()}
                                    >
                                        <SelectTrigger className="border-destructive/50 focus:ring-destructive/50">
                                            <SelectValue placeholder="Select a reason..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {validStatuses?.map((status: any) => (
                                                <SelectItem key={status.id} value={status.id.toString()}>
                                                    {status.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="preventionMeasures"
                                label="What Would You Do to Ensure This is Not Repeated?"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        rows={4}
                                        placeholder="Describe the steps you will take to prevent this from happening again..."
                                        className="border-destructive/50 focus:ring-destructive/50"
                                    />
                                )}
                            </FieldWrapper>

                            {/* <FieldWrapper
                                control={form.control}
                                name="tmsImprovements"
                                label="Any Improvements Needed in the TMS System?"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        rows={4}
                                        placeholder="Suggest improvements to the TMS system to help avoid repeating this mistake..."
                                        className="border-destructive/50 focus:ring-destructive/50"
                                    />
                                )}
                            </FieldWrapper> */}
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
                                variant="destructive"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <XCircle className="mr-2 h-4 w-4" />
                                Mark as DNB
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
