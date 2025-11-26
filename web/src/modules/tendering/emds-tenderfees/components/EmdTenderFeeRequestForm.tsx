import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTender } from '@/hooks/api/useTenders';
import { useCreatePaymentRequest } from '@/hooks/api/useEmds';
import { EmdSection } from './EmdSection';
import { TenderFeeSection } from './TenderFeeSection';
import { ProcessingFeeSection } from './ProcessingFeeSection';
// import { PaymentTimeline } from './PaymentTimeline';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { Button } from '@/components/ui/button';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { toast } from 'sonner';
import { formatINR } from '@/hooks/useINRFormatter';

// Full Zod Schema (all fields)
const EmdRequestSchema = z.object({
    // EMD
    emdMode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE', 'BANK_TRANSFER', 'PORTAL']).optional(),
    emd: z.object({
        ddFavouring: z.string().optional(),
        ddPayableAt: z.string().optional(),
        ddDeliverBy: z.string().optional(),
        ddPurpose: z.string().optional(),
        ddCourierAddress: z.string().optional(),
        ddCourierHours: z.coerce.number().optional(),
        ddDate: z.string().optional(),
        ddRemarks: z.string().optional(),

        fdrFavouring: z.string().optional(),
        fdrExpiryDate: z.string().optional(),
        fdrDeliverBy: z.string().optional(),
        fdrPurpose: z.string().optional(),
        fdrCourierAddress: z.string().optional(),
        fdrCourierHours: z.coerce.number().optional(),
        fdrDate: z.string().optional(),

        bgNeededIn: z.string().optional(),
        bgPurpose: z.string().optional(),
        bgFavouring: z.string().optional(),
        bgAddress: z.string().optional(),
        bgExpiryDate: z.string().optional(),
        bgClaimPeriod: z.string().optional(),
        bgStampValue: z.coerce.number().optional(),
        bgFormatFiles: z.array(z.string()).optional(),
        bgPoFiles: z.array(z.string()).optional(),
        bgClientUserEmail: z.string().email().optional().or(z.literal('')),
        bgClientCpEmail: z.string().email().optional().or(z.literal('')),
        bgClientFinanceEmail: z.string().email().optional().or(z.literal('')),
        bgCourierAddress: z.string().optional(),
        bgCourierDays: z.coerce.number().min(1).max(10).optional(),
        bgBank: z.string().optional(),

        btPurpose: z.string().optional(),
        btAccountName: z.string().optional(),
        btAccountNo: z.string().optional(),
        btIfsc: z.string().optional(),

        portalPurpose: z.string().optional(),
        portalName: z.string().optional(),
        portalNetBanking: z.enum(['YES', 'NO']).optional(),
        portalDebitCard: z.enum(['YES', 'NO']).optional(),
    }).optional(),

    // Tender Fee
    tenderFeeMode: z.enum(['PORTAL', 'BANK_TRANSFER', 'DD']).optional(),
    tenderFee: z.object({
        ddFavouring: z.string().optional(),
        ddPayableAt: z.string().optional(),
        ddDeliverBy: z.string().optional(),
        ddPurpose: z.string().optional(),
        ddCourierAddress: z.string().optional(),
        ddCourierHours: z.coerce.number().optional(),

        btAccountName: z.string().optional(),
        btAccountNo: z.string().optional(),
        btIfsc: z.string().optional(),

        portalName: z.string().optional(),
        portalNetBanking: z.enum(['YES', 'NO']).optional(),
        portalDebitCard: z.enum(['YES', 'NO']).optional(),
    }).optional(),

    // Processing Fee
    processingFeeMode: z.enum(['PORTAL', 'BANK_TRANSFER', 'DD']).optional(),
    processingFee: z.object({
        ddFavouring: z.string().optional(),
        ddPayableAt: z.string().optional(),
        ddDeliverBy: z.string().optional(),
        ddPurpose: z.string().optional(),
        ddCourierAddress: z.string().optional(),
        ddCourierHours: z.coerce.number().optional(),

        btAccountName: z.string().optional(),
        btAccountNo: z.string().optional(),
        btIfsc: z.string().optional(),

        portalName: z.string().optional(),
        portalNetBanking: z.enum(['YES', 'NO']).optional(),
        portalDebitCard: z.enum(['YES', 'NO']).optional(),
    }).optional(),
});

type FormValues = z.infer<typeof EmdRequestSchema>;

interface EmdTenderFeeRequestFormProps {
    tenderId: number;
}

export function EmdTenderFeeRequestForm({ tenderId }: EmdTenderFeeRequestFormProps) {
    const navigate = useNavigate();
    const { data: tender, isLoading } = useTender(Number(tenderId));
    const { data: infoSheet, isLoading: isInfoSheetLoading } = useInfoSheet(tenderId);
    const createRequest = useCreatePaymentRequest();

    const form = useForm<FormValues>({
        resolver: zodResolver(EmdRequestSchema) as any,
        defaultValues: {
            emd: {},
            tenderFee: {},
            processingFee: {},
        },
    });

    const handleSubmit = async (values: FormValues) => {
        try {
            await createRequest.mutateAsync({
                tenderId: Number(tenderId),
                data: values,
            });
            navigate(-1);
        } catch (error) {
            toast.error('Failed to create EMD & Tender Fee request');
            console.error(error);
        }
    };

    if (isLoading || !tender || isInfoSheetLoading) {
        return <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Loading tender and info sheet details...</AlertDescription>
        </Alert>;
    }

    const hasEmd = tender.emd > 0;
    const hasTenderFee = tender.tenderFees > 0;
    const hasProcessingFee = infoSheet?.processingFeeAmount || 0 > 0;

    if (!hasEmd && !hasTenderFee && !hasProcessingFee) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No EMD or Fee required for this tender.</AlertDescription>
            </Alert>
        );
    }

    function normalizeModes(modes: string | string[] | undefined | null): string[] {
        if (!modes) return [];
        if (Array.isArray(modes)) {
            return modes
                .map(m => (typeof m === 'string' ? m.trim() : m))
                .filter(m => m !== '');
        }
        if (typeof modes === 'string') {
            return modes
                .split(',')
                .map(m => m.trim())
                .filter(m => m !== '');
        }
        return [];
    }

    const allowedEmdModes = normalizeModes(tender?.emdMode);
    const allowedTenderFeeModes = normalizeModes(tender?.tenderFeeMode);
    const allowedProcessingFeeModes = normalizeModes(infoSheet?.processingFeeModes);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Raise Request</CardTitle>
                <CardDescription>
                    <p className="text-sm text-muted-foreground">
                        Tender No: <b>{tender.tenderNo}</b>,&nbsp;
                        Name: <b>{tender.tenderName}</b>,&nbsp;
                        Assigned to: <b>{tender.teamMemberName}</b>,&nbsp;
                        Due Date: <b>{tender.dueDate ? formatDateTime(tender.dueDate) : "Not set"}</b>
                    </p>
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> <span className="hidden md:block">Back to List</span>
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-10">

                        {/* EMD Section */}
                        {hasEmd && <EmdSection allowedModes={allowedEmdModes || []} />}

                        {/* Tender Fee Section */}
                        {hasTenderFee && (
                            <TenderFeeSection
                                prefix="tenderFee"
                                title="Tender Fee"
                                allowedModes={allowedTenderFeeModes || []}
                            />
                        )}

                        {/* Processing Fee Section */}
                        {hasProcessingFee && (
                            <ProcessingFeeSection
                                amount={infoSheet?.processingFeeAmount || 0}
                                allowedModes={allowedProcessingFeeModes || []}
                            />
                        )}

                        {/* Timeline */}
                        {/* <PaymentTimeline tenderId={tenderId} /> */}

                        {/* Submit */}
                        <div className="flex items-center justify-end gap-4 pt-8 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate(-1)}
                                disabled={createRequest.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={createRequest.isPending}
                                className="min-w-48"
                            >
                                {createRequest.isPending ? (
                                    <>Submitting Request...</>
                                ) : (
                                    <>
                                        <Save className="md:mr-2 mr-0 h-5 w-5" />
                                        Submit Request (
                                        {
                                            [hasEmd, hasTenderFee, hasProcessingFee].filter(Boolean).length
                                        } item{
                                            [hasEmd, hasTenderFee, hasProcessingFee].filter(Boolean).length > 1 ? 's' : ''
                                        }
                                        )
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    );
}
