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
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import z from "zod";

// Move schema outside component to prevent recreation on every render
const EmdFollowupSchema = z.object({
    area: z.string(),
    followupFor: z.string(),
    assignedToId: z.number(),
    createdById: z.number(),
    organization: z.string().optional(),
    contacts: z.array(ContactPersonSchema).optional(),
    startFrom: z.string().optional(),
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

    // All hooks must be called unconditionally at the top level
    const { data: paymentRequests, isLoading, error } = usePaymentRequest(id ? Number(id) : null);

    // Always call useTender - pass null when not ready
    const tenderId = paymentRequests?.tenderId ?? null;
    const { data: tender } = useTender(tenderId && tenderId > 0 ? tenderId : null);

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
            assignedToId: 0,
            createdById: 0,
            assignmentStatus: "assigned",
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
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                // Skip follow-up fields - handled by different service
                if (
                    key === 'contacts' ||
                    key === 'organization' ||
                    key === 'startFrom' ||
                    key === 'frequency' ||
                    key === 'stop_reason' ||
                    key === 'proof_text' ||
                    key === 'stop_remarks' ||
                    key === 'proof_image'
                ) {
                    return;
                }

                // Handle File objects (non-followup files)
                if (value instanceof File) {
                    formData.append(key, value);
                    return;
                }

                // Handle arrays of Files
                if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
                    value.forEach((file) => formData.append(key, file));
                    return;
                }

                // Handle all other values (strings, numbers, dates, file paths, etc.)
                if (value === undefined || value === null || value === '') return;
                if (value instanceof Date) {
                    formData.append(key, value.toISOString());
                } else if (typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            });

            // TODO: Add actual API call here
            // await submitEmdFollowUp(formData);

            toast.success('Action submitted successfully');
            navigate(-1);
            form.reset();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to submit action');
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

    if (isLoading) {
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Initiate Followup */}
                <div className="space-y-4 border rounded-lg p-4">
                    <h4 className="font-semibold text-base">Initiate Followup</h4>

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
    );
};

export default EmdFollowUpPage;
