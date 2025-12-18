import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Upload, IndianRupee } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useEffect } from 'react';
import { useSubmitBid, useUpdateBidSubmission } from '@/hooks/api/useBidSubmissions';
import type { BidSubmission } from '@/types/api.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { FileUploadField } from '@/components/form/FileUploadField';

const SubmitBidFormSchema = z.object({
    tenderId: z.number(),
    submissionDatetime: z.string().min(1, 'Bid submission date and time is required'),
    submittedDocs: z.preprocess(
        (val) => {
            if (!val) return undefined;
            if (Array.isArray(val)) {
                return val.map((f: File | string) => typeof f === 'string' ? f : f.name).join(', ');
            }
            if (val instanceof File) {
                return val.name;
            }
            return val;
        },
        z.string().optional()
    ),
    proofOfSubmission: z.preprocess(
        (val) => {
            if (val instanceof File) {
                return val.name;
            }
            return val;
        },
        z.string().min(1, 'Proof of submission is required')
    ),
    finalPriceSs: z.preprocess(
        (val) => {
            if (val instanceof File) {
                return val.name;
            }
            return val;
        },
        z.string().min(1, 'Final bidding price screenshot is required')
    ),
    finalBiddingPrice: z.string().optional(),
});

type FormValues = z.infer<typeof SubmitBidFormSchema>;

interface SubmitBidFormProps {
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
        emdAmount: string | null;
        gstValues: number;
        finalCosting: string | null;
    };
    mode: 'submit' | 'edit';
    existingData?: BidSubmission;
}

export default function SubmitBidForm({
    tenderId,
    tenderDetails,
    mode,
    existingData
}: SubmitBidFormProps) {
    const navigate = useNavigate();
    const submitMutation = useSubmitBid();
    const updateMutation = useUpdateBidSubmission();

    const form = useForm<FormValues>({
        resolver: zodResolver(SubmitBidFormSchema),
        defaultValues: {
            tenderId: tenderId,
            submissionDatetime: '',
            submittedDocs: '',
            proofOfSubmission: '',
            finalPriceSs: '',
            finalBiddingPrice: '',
        },
    });

    useEffect(() => {
        if (existingData && mode === 'edit') {
            form.reset({
                tenderId: tenderId,
                submissionDatetime: existingData.submissionDatetime
                    ? new Date(existingData.submissionDatetime).toISOString().slice(0, 16)
                    : '',
                submittedDocs: existingData.documents?.submittedDocs?.join(', ') || '',
                proofOfSubmission: existingData.documents?.submissionProof || '',
                finalPriceSs: existingData.documents?.finalPriceSs || '',
                finalBiddingPrice: existingData.finalBiddingPrice || '',
            });
        }
    }, [existingData, form, tenderId, mode]);

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            // submittedDocs is now preprocessed to a comma-separated string or undefined
            const submittedDocs = data.submittedDocs
                ? data.submittedDocs.split(',').map(s => s.trim()).filter(s => s.length > 0)
                : [];

            // proofOfSubmission and finalPriceSs are now preprocessed to strings
            if (mode === 'submit') {
                await submitMutation.mutateAsync({
                    tenderId: data.tenderId,
                    submissionDatetime: data.submissionDatetime,
                    submittedDocs: submittedDocs,
                    proofOfSubmission: data.proofOfSubmission,
                    finalPriceSs: data.finalPriceSs,
                    finalBiddingPrice: data.finalBiddingPrice || null,
                });
            } else if (existingData?.id) {
                await updateMutation.mutateAsync({
                    id: existingData.id,
                    data: {
                        submissionDatetime: data.submissionDatetime,
                        submittedDocs: submittedDocs,
                        proofOfSubmission: data.proofOfSubmission,
                        finalPriceSs: data.finalPriceSs,
                        finalBiddingPrice: data.finalBiddingPrice || null,
                    },
                });
            }
            navigate(paths.tendering.bidSubmissions);
        } catch (error) {
            console.error('Error submitting bid:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'submit' ? 'Submit Bid' : 'Edit Bid Submission'}</CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'submit'
                                ? 'Submit bid details for this tender'
                                : 'Update bid submission information'}
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
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                                    <p className="text-base font-semibold">
                                        {tenderDetails.dueDate ? formatDateTime(tenderDetails.dueDate) : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">EMD</p>
                                    <p className="text-base font-semibold">
                                        {tenderDetails.emdAmount
                                            ? formatINR(parseFloat(tenderDetails.emdAmount))
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tender Value</p>
                                    <p className="text-base font-semibold">
                                        {formatINR(tenderDetails.gstValues)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Final Costing (Approved)</p>
                                    <p className="text-base font-semibold text-green-600">
                                        {tenderDetails.finalCosting
                                            ? formatINR(parseFloat(tenderDetails.finalCosting))
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bid Submission Details */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Bid Submission Details
                            </h4>

                            <div className="grid gap-4 md:grid-cols-2">
                                <FieldWrapper
                                    control={form.control}
                                    name="submissionDatetime"
                                    label="Bid Submission Date & Time"
                                >
                                    {(field) => (
                                        <Input
                                            {...field}
                                            type="datetime-local"
                                            placeholder="Select date and time"
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper
                                    control={form.control}
                                    name="finalBiddingPrice"
                                    label="Final Bidding Price (Optional)"
                                    description="Enter the actual price you bid (may differ from approved costing)"
                                >
                                    {(field) => (
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                {...field}
                                                type="number"
                                                step="0.01"
                                                className="pl-10"
                                                placeholder="Enter final bidding price"
                                            />
                                        </div>
                                    )}
                                </FieldWrapper>
                                <FileUploadField
                                    control={form.control}
                                    name="submittedDocs"
                                    label="Submitted Bid Documents (Optional)"
                                    allowMultiple
                                    acceptedFileTypes={['image/*', 'application/pdf']}
                                />
                                <FileUploadField
                                    control={form.control}
                                    name="proofOfSubmission"
                                    label="Proof of Submission"
                                    acceptedFileTypes={['image/*', 'application/pdf']}
                                />
                                <FileUploadField
                                    control={form.control}
                                    name="finalPriceSs"
                                    label="Final Bidding Price Screenshot"
                                    acceptedFileTypes={['image/*', 'application/pdf']}
                                />
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
                                {mode === 'submit' ? 'Submit Bid' : 'Update Bid'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
