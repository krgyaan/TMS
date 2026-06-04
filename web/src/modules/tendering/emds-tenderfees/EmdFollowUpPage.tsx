import { ContactPersonFields } from "@/components/form/ContactPersonFields";
import DateInput from "@/components/form/DateInput";
import FieldWrapper from "@/components/form/FieldWrapper";
import { FollowUpFrequencySelect } from "@/components/form/FollowUpFrequencySelect";
import { FollowupEmailEditor } from "@/components/form/FollowupEmailEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentRequest } from "@/hooks/api/usePaymentRequests";
import { useTender } from "@/hooks/api/useTenders";
import { formatINR } from "@/hooks/useINRFormatter";
import { bankGuaranteesService } from "@/services/api/bank-guarantees.service";
import { bankTransfersService } from "@/services/api/bank-transfers.service";
import { chequesService } from "@/services/api/cheques.service";
import { demandDraftsService } from "@/services/api/demand-drafts.service";
import { fdrsService } from "@/services/api/fdrs.service";
import { payOnPortalsService } from "@/services/api/pay-on-portals.service";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, FileText, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import z from "zod";

const ContactSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
});

const DEFAULT_ATTACHMENTS = [
    "cancelled-cheque-au-small-inflow-ac.pdf",
    "au-bank-mandate-form.pdf",
];

const EmdFollowupSchema = z.object({
    organization: z.string().min(1, "Organization is required"),
    contacts: z.array(ContactSchema).min(1, "At least one contact is required"),
    startFrom: z.string().min(1, "Start Date is required"),
    frequency: z.number().int().min(1).max(6).optional(),
});

type EmdFollowupForm = z.infer<typeof EmdFollowupSchema>;

const INSTRUMENT_SERVICE_MAP: Record<string, typeof fdrsService|typeof demandDraftsService|typeof chequesService|typeof bankTransfersService|typeof payOnPortalsService|typeof bankGuaranteesService> = {
    'FDR': fdrsService,
    'DD': demandDraftsService,
    'Cheque': chequesService,
    'Bank Transfer': bankTransfersService,
    'Portal Payment': payOnPortalsService,
    'BG': bankGuaranteesService,
};

const MODE_LABEL: Record<string, string> = {
    'DD': 'Demand Draft',
    'FDR': 'Fixed Deposit Receipt',
    'Cheque': 'Cheque',
    'BG': 'Bank Guarantee',
    'Bank Transfer': 'Bank Transfer',
    'Portal Payment': 'Portal Payment',
};

const EmdFollowUpPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const emdIdNumber = id ? Number(id) : null;

    const { data: paymentRequests, isLoading, error } = usePaymentRequest(emdIdNumber);

    const tenderId = paymentRequests?.tenderId ?? null;
    const { data: tender } = useTender(tenderId && tenderId > 0 ? tenderId : null);

    const [emailBody, setEmailBody] = useState<string>("");

    const instrument = paymentRequests?.instruments?.[0];
    const instrumentId = instrument?.id;
    const instrumentType = instrument?.instrumentType ?? '';

    const service = INSTRUMENT_SERVICE_MAP[instrumentType];

    const templateData = useMemo(() => {
        const details = instrument?.details as Record<string, unknown> | null;
        const type = instrumentType;
        return {
            tenderNo: paymentRequests?.tenderNo,
            projectName: paymentRequests?.projectName,
            status: tender?.statusName || '',
            amount: paymentRequests?.amountRequired,
            ddNo: type === 'DD' ? (details?.ddNo as string | undefined) : undefined,
            fdrNo: type === 'FDR' ? (details?.fdrNo as string | undefined) : undefined,
            date: type === 'DD' ? (details?.ddDate as string | undefined)
                : type === 'FDR' ? (details?.fdrDate as string | undefined)
                : type === 'Cheque' ? (details?.chequeDate as string | undefined)
                : type === 'Bank Transfer' ? (details?.transactionDate as string | undefined)
                : type === 'Portal Payment' ? (details?.transactionDate as string | undefined)
                : type === 'BG' ? (details?.bgDate as string | undefined)
                : undefined,
            expiryDate: type === 'FDR' ? (details?.fdrExpiryDate as string | undefined)
                : type === 'BG' ? (details?.validityDate as string | undefined)
                : undefined,
        };
    }, [paymentRequests, instrument, instrumentType]);

    const form = useForm<EmdFollowupForm>({
        resolver: zodResolver(EmdFollowupSchema) as Resolver<EmdFollowupForm>,
        defaultValues: {
            organization: '',
            startFrom: '',
            frequency: 1,
            contacts: [],
        },
    });

    const [attachments, setAttachments] = useState<string[]>(DEFAULT_ATTACHMENTS);

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (tender && !form.getValues('organization')) {
            const orgName = tender.organizationName || tender.organizationAcronym || '';
            if (orgName) {
                form.setValue('organization', orgName);
            }
        }
    }, [tender, form]);

    const isSubmitting = form.formState.isSubmitting;

    const handleSubmit = async (values: EmdFollowupForm) => {
        if (!service || !instrumentId) {
            toast.error("Unable to determine instrument type for follow-up");
            return;
        }

        try {
            const payload: Record<string, unknown> = {
                action: 'initiate-followup',
                organisation_name: values.organization,
                contacts: values.contacts?.map(c => ({
                    name: c.name,
                    email: c.email || null,
                    phone: c.phone || null,
                })) || [],
                followup_start_date: values.startFrom,
                frequency: values.frequency,
                emailBody,
                attachments,
            };

            await service.updateAction(instrumentId, payload);
            toast.success('Follow-up initiated successfully');
            navigate(-1);
            form.reset();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const message = err?.response?.data?.message || err?.message || 'Failed to initiate follow-up';
            toast.error(message);
            console.error('Error initiating follow-up:', error);
        }
    };

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Payment request ID is required</AlertDescription>
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
                <AlertDescription>Failed to load payment request</AlertDescription>
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

    if (!service) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Unsupported instrument type: {instrumentType}</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Initiate Followup</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    Start a follow-up process with organisation contacts
                </p>
            </CardHeader>
            <CardContent>
                <div className="mb-4 text-sm text-muted-foreground space-y-1">
                    <p>Tender No: {tender?.tenderNo || paymentRequests?.tenderNo} | Tender Name: {tender?.tenderName || paymentRequests?.projectName}</p>
                    <p>Amount: {formatINR(paymentRequests?.amountRequired)} via {MODE_LABEL[instrumentType] || instrumentType}</p>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={form.control} name="organization" label="Organisation Name">
                                    {(field) => <Input {...field} placeholder="Enter organisation name" />}
                                </FieldWrapper>
                            </div>

                            <div>
                                <ContactPersonFields control={form.control} name="contacts" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={form.control} name="startFrom" label="Follow-up Start Date">
                                    {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FollowUpFrequencySelect control={form.control} name="frequency" />
                            </div>

                            <div className="pt-4 border-t">
                                <FollowupEmailEditor
                                    key={`${instrumentType}-${paymentRequests?.tenderNo}`}
                                    instrumentType={instrumentType}
                                    templateData={templateData}
                                    onEmailBodyChange={(html) => setEmailBody(html)}
                                />
                            </div>

                            <div className="pt-4 border-t">
                                <label className="text-sm font-medium mb-2 block">Attachments</label>
                                <p className="text-xs text-muted-foreground mb-3">Files will be read from the accounts upload directory</p>
                                <div className="space-y-2">
                                    {attachments.map((file, index) => (
                                        <div key={file} className="flex items-center gap-2 text-sm">
                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="flex-1 truncate">{file}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeAttachment(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Initiate Followup'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default EmdFollowUpPage;
