import { ContactPersonFields } from "@/components/form/ContactPersonFields";
import DateInput from "@/components/form/DateInput";
import FieldWrapper from "@/components/form/FieldWrapper";
import { FollowUpFrequencySelect } from "@/components/form/FollowUpFrequencySelect";
import { StopReasonFields } from "@/components/form/StopReasonFields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { usePaymentRequest } from "@/hooks/api/useEmds";
import { useTender } from "@/hooks/api/useTenders";
import { ContactPersonSchema } from "@/modules/shared/follow-up/follow-up.types";
import { useCreateFollowUp, useUpdateFollowUp, useEmdMailPreview } from "@/modules/shared/follow-up/follow-up.hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import z from "zod";
import { formatINR } from "@/hooks/useINRFormatter";

// Move schema outside component to prevent recreation on every render
const EmdFollowupSchema = z.object({
    area: z.string(),
    followupFor: z.string(),
    assignedToId: z.number(),
    createdById: z.number(),
    organization: z.string().min(1, "Organization is required"),
    contacts: z.array(ContactPersonSchema).min(1, "Contact is required"),
    startFrom: z.string().min(1, "Start Date is required"),
    comment: z.string().optional(),
    assignmentStatus: z.string().optional(),
    frequency: z.number().int().min(1).max(6).optional(),
    stop_reason: z.number().int().min(1).max(4).optional().nullable(),
    proof_text: z.string().optional().nullable(),
    stop_remarks: z.string().optional().nullable(),
    proof_image: z.any().optional(),
});

type EmdFollowupForm = z.infer<typeof EmdFollowupSchema>;

function mapInstrumentTypeToMode(instrumentType: string | null): string | undefined {
    if (!instrumentType) return undefined;
    const mapping: Record<string, string> = {
        'Bank Transfer': 'BT',
        'Portal Payment': 'POP',
        'DD': 'DD',
        'FDR': 'FDR',
        'BG': 'BG',
        'Cheque': 'CHEQUE',
    };
    return mapping[instrumentType];
}

const EmdFollowUpPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const emdIdNumber = id ? Number(id) : null;

    // Follow-up mutations
    const { mutateAsync: createFollowUp } = useCreateFollowUp();
    const { mutateAsync: updateFollowUp } = useUpdateFollowUp();

    // All hooks must be called unconditionally at the top level
    const { data: paymentRequests, isLoading, error } = usePaymentRequest(emdIdNumber);

    // Always call useTender - pass null when not ready
    const tenderId = paymentRequests?.tenderId ?? null;
    const { data: tender } = useTender(tenderId && tenderId > 0 ? tenderId : null);

    // Fetch template string for the specific EMD
    const { data: previewData, isLoading: isLoadingPreview } = useEmdMailPreview(emdIdNumber);

    // Compute emdData (kept for future use if needed)
    const emdData = useMemo(() => {
        if (!paymentRequests) {
            return undefined;
        }

        const instrument = paymentRequests.instruments?.[0];
        if (!instrument) return undefined;

        const mode = mapInstrumentTypeToMode(instrument.instrumentType);

        if (paymentRequests.purpose === 'EMD') {
            return {
                emdMode: mode,
                emdAmount: paymentRequests.amountRequired,
                requestId: id,
            };
        }

        return undefined;
    }, [paymentRequests, id]);

    const form = useForm<EmdFollowupForm>({
        resolver: zodResolver(EmdFollowupSchema) as Resolver<EmdFollowupForm>,
        defaultValues: {
            area: '',
            followupFor: 'Emd Refund',
            organization: '',
            assignedToId: tender?.teamMember ?? 0,
            createdById: tender?.teamMember ?? 0,
            assignmentStatus: "initiated",
            comment: '',
            frequency: 1,
            startFrom: '',
            contacts: [],
        },
    });

    // Update form values when tender data loads
    useEffect(() => {
        if (tender) {
            form.setValue('area', tender.team === 1 ? 'AC Team' : 'DC Team');
        }
    }, [tender, form]);

    const isSubmitting = form.formState.isSubmitting;

    const handleSubmit = async (values: EmdFollowupForm) => {
        try {
            // Step 1: Create base follow-up via JSON
            const payload: any = {
                area: values.area,
                partyName: values.organization || '',
                amount: emdData?.emdAmount,
                assignedToId: Number(values.assignedToId),
                createdById: Number(values.createdById),
                comment: values.comment,
                contacts: values.contacts?.map(c => ({
                    name: c.name,
                    email: c.email || null,
                    phone: c.phone || null,
                })) || [],
                emdId: emdIdNumber,
                details: previewData?.html ?? '',
            };

            if (values.startFrom) {
                payload.startFrom = new Date(values.startFrom).toISOString().split('T')[0];
            }

            const newFollowUp = await createFollowUp(payload);

            // Step 2: Use update API via FormData for the extra fields if any are present
            const frequency = values.frequency;
            const stopReason = values.stop_reason;
            const proofImage = values.proof_image;
            const proofText = values.proof_text;
            const stopRemarks = values.stop_remarks;

            const hasExtraFields = frequency || stopReason || proofImage || proofText || stopRemarks;

            if (hasExtraFields && newFollowUp?.id) {
                const formData = new FormData();

                if (frequency) formData.append('frequency', String(frequency));
                if (stopReason) formData.append('stopReason', String(stopReason));
                if (proofText) formData.append('proofText', proofText);
                if (stopRemarks) formData.append('stopRemarks', stopRemarks);

                if (proofImage) {
                    if (Array.isArray(proofImage) && proofImage.length > 0 && proofImage[0] instanceof File) {
                        formData.append('attachments', proofImage[0]);
                    } else if (proofImage instanceof File) {
                        formData.append('attachments', proofImage);
                    }
                }

                await updateFollowUp({ id: newFollowUp.id, data: formData });
            }

            toast.success('Follow-up created successfully');
            navigate(-1);
            form.reset();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to submit follow-up action';
            toast.error(message);
            console.error('Error submitting action:', error);
        }
    };

    // Conditional renders AFTER all hooks
    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>EMD ID is required</AlertDescription>
            </Alert>
        );
    }

    if (isLoading || isLoadingPreview) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load EMD</AlertDescription>
            </Alert>
        );
    }

    if (!paymentRequests) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No payment request data found</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="border rounded-lg p-6 bg-muted/20">
            <div className="mb-4">
                <h3 className="text-lg font-semibold">Initiate Followup</h3>
                <p className="text-muted-foreground">Tender No: {tender?.tenderNo} | Tender Name: {tender?.tenderName}</p>
                <p className="text-muted-foreground">EMD Amount: {formatINR(emdData?.emdAmount)} via {emdData?.emdMode}</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Initiate Followup */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="organization" label="Organization Name">
                                {(field) => <Input {...field} placeholder="Enter organisation name" />}
                            </FieldWrapper>
                            <div className="col-span-3">
                                <ContactPersonFields control={form.control} name="contacts" />
                            </div>
                            <FieldWrapper control={form.control} name="startFrom" label="Follow-up Start Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FollowUpFrequencySelect control={form.control} name="frequency" />
                        </div>

                        <div className="col-span-3">
                            <StopReasonFields
                                control={form.control}
                                frequencyFieldName="frequency"
                                stopReasonFieldName="stop_reason"
                                proofTextFieldName="proof_text"
                                stopRemarksFieldName="stop_remarks"
                                proofImageFieldName="proof_image"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default EmdFollowUpPage;
