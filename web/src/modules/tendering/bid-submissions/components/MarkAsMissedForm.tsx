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
import { useEffect } from 'react';
import { useMarkAsMissed, useUpdateBidSubmission } from '@/hooks/api/useBidSubmissions';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { MarkAsMissedFormSchema, type MarkAsMissedFormValues } from '../helpers/bidSubmission.schema';
import type { MarkAsMissedFormProps } from '../helpers/bidSubmission.types';

type FormValues = MarkAsMissedFormValues;

export default function MarkAsMissedForm({
    tenderId,
    tenderDetails,
    mode,
    existingData
}: MarkAsMissedFormProps) {
    const navigate = useNavigate();
    const markMissedMutation = useMarkAsMissed();
    const updateMutation = useUpdateBidSubmission();

    const form = useForm<FormValues>({
        resolver: zodResolver(MarkAsMissedFormSchema),
        defaultValues: {
            tenderId: tenderId,
            reasonForMissing: '',
            preventionMeasures: '',
            tmsImprovements: '',
        },
    });

    useEffect(() => {
        if (existingData && mode === 'edit') {
            form.reset({
                tenderId: tenderId,
                reasonForMissing: existingData.reasonForMissing || '',
                preventionMeasures: existingData.preventionMeasures || '',
                tmsImprovements: existingData.tmsImprovements || '',
            });
        }
    }, [existingData, form, tenderId, mode]);

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            if (mode === 'missed') {
                await markMissedMutation.mutateAsync({
                    tenderId: data.tenderId,
                    reasonForMissing: data.reasonForMissing,
                    preventionMeasures: data.preventionMeasures,
                    tmsImprovements: data.tmsImprovements,
                });
            } else if (existingData?.id) {
                await updateMutation.mutateAsync({
                    id: existingData.id,
                    data: {
                        reasonForMissing: data.reasonForMissing,
                        preventionMeasures: data.preventionMeasures,
                        tmsImprovements: data.tmsImprovements,
                    },
                });
            }
            navigate(paths.tendering.bidSubmissions);
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
                            {mode === 'missed' ? 'Mark Tender as Missed' : 'Edit Missed Tender'}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'missed'
                                ? 'Provide details about why this tender was missed'
                                : 'Update missed tender information'}
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
                                name="reasonForMissing"
                                label="Reason for Missing the Tender"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        rows={4}
                                        placeholder="Explain in detail why this tender was missed..."
                                        className="border-destructive/50 focus:ring-destructive/50"
                                    />
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

                            <FieldWrapper
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
                                variant="destructive"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <XCircle className="mr-2 h-4 w-4" />
                                {mode === 'missed' ? 'Mark as Missed' : 'Update'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
