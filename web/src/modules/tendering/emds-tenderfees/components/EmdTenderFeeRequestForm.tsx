import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTender } from '@/hooks/api/useTenders';
import { useCreatePaymentRequest } from '@/hooks/api/useEmds';
import { EmdSection } from './EmdSection';
import { TenderFeeSection } from './TenderFeeSection';
import { ProcessingFeeSection } from './ProcessingFeeSection';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { Button } from '@/components/ui/button';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { toast } from 'sonner';
import { formatINR } from '@/hooks/useINRFormatter';
import { parseAllowedModes } from '../constants';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Schema
// ============================================================================

const PaymentDetailsSchema = z.object({
    // DD fields
    ddFavouring: z.string().optional(),
    ddPayableAt: z.string().optional(),
    ddDeliverBy: z.string().optional(),
    ddPurpose: z.string().optional(),
    ddCourierAddress: z.string().optional(),
    ddCourierHours: z.coerce.number().optional(),
    ddDate: z.string().optional(),
    ddRemarks: z.string().optional(),

    // FDR fields
    fdrFavouring: z.string().optional(),
    fdrExpiryDate: z.string().optional(),
    fdrDeliverBy: z.string().optional(),
    fdrPurpose: z.string().optional(),
    fdrCourierAddress: z.string().optional(),
    fdrCourierHours: z.coerce.number().optional(),
    fdrDate: z.string().optional(),

    // BG fields
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

    // Bank Transfer fields
    btPurpose: z.string().optional(),
    btAccountName: z.string().optional(),
    btAccountNo: z.string().optional(),
    btIfsc: z.string().optional(),

    // Portal fields
    portalPurpose: z.string().optional(),
    portalName: z.string().optional(),
    portalNetBanking: z.enum(['YES', 'NO']).optional(),
    portalDebitCard: z.enum(['YES', 'NO']).optional(),

    // Cheque fields
    chequeFavouring: z.string().optional(),
    chequeDate: z.string().optional(),
    chequeNeededIn: z.string().optional(),
    chequePurpose: z.string().optional(),
    chequeAccount: z.string().optional(),
});

const EmdRequestSchema = z.object({
    // EMD
    emd: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE', 'BANK_TRANSFER', 'PORTAL', 'SURETY_BOND', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).optional(),

    // Tender Fee
    tenderFee: z.object({
        mode: z.enum(['PORTAL', 'BANK_TRANSFER', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).optional(),

    // Processing Fee
    processingFee: z.object({
        mode: z.enum(['PORTAL', 'BANK_TRANSFER', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).optional(),
});

type FormValues = z.infer<typeof EmdRequestSchema>;

interface EmdTenderFeeRequestFormProps {
    tenderId: number;
}

// ============================================================================
// Component
// ============================================================================

export function EmdTenderFeeRequestForm({ tenderId }: EmdTenderFeeRequestFormProps) {
    const navigate = useNavigate();
    const { data: tender, isLoading: isTenderLoading } = useTender(Number(tenderId));
    const { data: infoSheet, isLoading: isInfoSheetLoading } = useInfoSheet(tenderId);
    const createRequest = useCreatePaymentRequest();

    const form = useForm<FormValues>({
        resolver: zodResolver(EmdRequestSchema),
        defaultValues: {
            emd: { mode: undefined, details: {} },
            tenderFee: { mode: undefined, details: {} },
            processingFee: { mode: undefined, details: {} },
        },
    });

    const handleSubmit = async (values: FormValues) => {
        // Only include sections that have a mode selected
        const payload: any = {};

        if (values.emd?.mode) {
            payload.emd = {
                mode: values.emd.mode,
                details: values.emd.details || {},
            };
        }

        if (values.tenderFee?.mode) {
            payload.tenderFee = {
                mode: values.tenderFee.mode,
                details: values.tenderFee.details || {},
            };
        }

        if (values.processingFee?.mode) {
            payload.processingFee = {
                mode: values.processingFee.mode,
                details: values.processingFee.details || {},
            };
        }

        // Check if at least one section is filled
        if (!payload.emd && !payload.tenderFee && !payload.processingFee) {
            toast.error('Please select at least one payment mode');
            return;
        }

        try {
            await createRequest.mutateAsync({
                tenderId: Number(tenderId),
                data: payload,
            });
            toast.success('Payment request created successfully');
            navigate(-1);
        } catch (error) {
            toast.error('Failed to create payment request');
            console.error(error);
        }
    };

    // Loading state
    if (isTenderLoading || isInfoSheetLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    // No tender found
    if (!tender) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Tender not found</AlertDescription>
            </Alert>
        );
    }

    // Parse amounts
    const emdAmount = Number(tender.emd) || 0;
    const tenderFeeAmount = Number(tender.tenderFees) || 0;
    const processingFeeAmount = Number(infoSheet?.processingFeeAmount) || 0;

    const hasEmd = emdAmount > 0;
    const hasTenderFee = tenderFeeAmount > 0;
    const hasProcessingFee = processingFeeAmount > 0;

    // Check if any payment is required
    if (!hasEmd && !hasTenderFee && !hasProcessingFee) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Payment Required</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No EMD, Tender Fee, or Processing Fee is required for this tender.
                        </AlertDescription>
                    </Alert>
                    <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Parse allowed modes
    const allowedEmdModes = parseAllowedModes(tender.emdMode);
    const allowedTenderFeeModes = parseAllowedModes(tender.tenderFeeMode);
    const allowedProcessingFeeModes = parseAllowedModes(infoSheet?.processingFeeMode);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Create Payment Request</CardTitle>
                <CardDescription>
                    <div className="space-y-1">
                        <p>
                            <span className="text-muted-foreground">Tender:</span>{' '}
                            <strong>{tender.tenderNo}</strong> - {tender.tenderName}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Assigned to:</span>{' '}
                            <strong>{tender.teamMemberName || 'Unassigned'}</strong>
                            {tender.dueDate && (
                                <>
                                    {' | '}
                                    <span className="text-muted-foreground">Due:</span>{' '}
                                    <strong>{formatDateTime(tender.dueDate)}</strong>
                                </>
                            )}
                        </p>
                        <p className="text-sm">
                            {hasEmd && <span className="mr-4">EMD: <strong>{formatINR(emdAmount)}</strong></span>}
                            {hasTenderFee && <span className="mr-4">Tender Fee: <strong>{formatINR(tenderFeeAmount)}</strong></span>}
                            {hasProcessingFee && <span>Processing Fee: <strong>{formatINR(processingFeeAmount)}</strong></span>}
                        </p>
                    </div>
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Back to List</span>
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

                        {/* EMD Section */}
                        {hasEmd && (
                            <EmdSection
                                allowedModes={allowedEmdModes}
                                amount={emdAmount}
                                defaultPurpose="EMD"
                            />
                        )}

                        {/* Tender Fee Section */}
                        {hasTenderFee && (
                            <TenderFeeSection
                                prefix="tenderFee"
                                title="Tender Fee"
                                allowedModes={allowedTenderFeeModes}
                                amount={tenderFeeAmount}
                                defaultPurpose="TENDER_FEES"
                            />
                        )}

                        {/* Processing Fee Section */}
                        {hasProcessingFee && (
                            <ProcessingFeeSection
                                amount={processingFeeAmount}
                                allowedModes={allowedProcessingFeeModes}
                            />
                        )}

                        {/* Submit Buttons */}
                        <div className="flex items-center justify-end gap-4 pt-6 border-t">
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
                                    'Submitting...'
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        Submit Request
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
