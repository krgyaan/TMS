import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useEffect } from 'react';
import { useUpdateTqReplied } from '@/hooks/api/useTqManagement';
import type { TenderQuery } from '@/types/api.types';
import { TenderFileUploader } from '@/components/tender-file-upload';

const TqRepliedFormSchema = z.object({
    repliedDatetime: z.string().min(1, 'TQ reply date and time is required'),
    repliedDocument: z.array(z.string()).default([]),
    proofOfSubmission: z.array(z.string()).min(1, 'Proof of submission is required'),
});

type FormValues = z.infer<typeof TqRepliedFormSchema>;

interface TqRepliedFormProps {
    tqData: TenderQuery;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
    };
    mode: 'replied' | 'edit';
}

export default function TqRepliedForm({
    tqData,
    tenderDetails,
    mode
}: TqRepliedFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateTqReplied();

    const form = useForm<FormValues>({
        resolver: zodResolver(TqRepliedFormSchema) as Resolver<FormValues>,
        defaultValues: {
            repliedDatetime: '',
            repliedDocument: [],
            proofOfSubmission: [],
        },
    });

    // Watch file values for display
    const repliedDocument = useWatch({ control: form.control, name: 'repliedDocument' });
    const proofOfSubmission = useWatch({ control: form.control, name: 'proofOfSubmission' });

    useEffect(() => {
        if (mode === 'edit' && tqData) {
            form.reset({
                repliedDatetime: tqData.repliedDatetime
                    ? new Date(tqData.repliedDatetime).toISOString().slice(0, 16)
                    : '',
                repliedDocument: tqData.repliedDocument ? [tqData.repliedDocument] : [],
                proofOfSubmission: tqData.proofOfSubmission ? [tqData.proofOfSubmission] : [],
            });
        }
    }, [tqData, form, mode]);

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            const repliedDocumentPath = data.repliedDocument.length > 0 ? data.repliedDocument[0] : null;
            const proofOfSubmissionPath = data.proofOfSubmission.length > 0 ? data.proofOfSubmission[0] : '';

            await updateMutation.mutateAsync({
                id: tqData.id,
                data: {
                    repliedDatetime: data.repliedDatetime,
                    repliedDocument: repliedDocumentPath,
                    proofOfSubmission: proofOfSubmissionPath,
                },
            });
            navigate(paths.tendering.tqManagement);
        } catch (error) {
            console.error('Error submitting TQ reply:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'replied' ? 'TQ Replied' : 'Edit TQ Reply'}</CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'replied'
                                ? 'Submit technical query reply details'
                                : 'Update TQ reply information'}
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

                        {/* TQ Reply Details */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                TQ Reply Details
                            </h4>

                            <FieldWrapper
                                control={form.control}
                                name="repliedDatetime"
                                label="TQ Reply Date & Time"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        type="datetime-local"
                                        placeholder="Select date and time"
                                    />
                                )}
                            </FieldWrapper>

                            <TenderFileUploader
                                context="tq-management"
                                value={repliedDocument}
                                onChange={(paths) => form.setValue('repliedDocument', paths)}
                                label="Submitted TQ Documents (Optional)"
                                disabled={isSubmitting}
                            />

                            <TenderFileUploader
                                context="tq-management"
                                value={proofOfSubmission}
                                onChange={(paths) => form.setValue('proofOfSubmission', paths)}
                                label="Proof of Submission"
                                disabled={isSubmitting}
                            />
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
                                {mode === 'replied' ? 'Submit Reply' : 'Update Reply'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
