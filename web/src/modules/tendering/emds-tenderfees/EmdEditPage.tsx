import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmdTenderFeeRequestForm } from "./components/EmdTenderFeeRequestForm";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Map instrument type to frontend mode code
 */
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

/**
 * Map backend instrument and details to frontend form details structure
 * The instrument object has both instrument table fields and a details property
 */
function mapDetailsToForm(instrumentType: string, instrument: any): any {
    if (!instrument) return {};

    // Merge instrument fields and details fields
    const merged = { ...instrument, ...(instrument.details || {}) };

    switch (instrumentType) {
        case 'DD':
        case 'Cheque':
            return {
                ddFavouring: merged.favouring || '',
                ddPayableAt: merged.payableAt || '',
                ddDeliverBy: merged.ddNeeds || '',
                ddPurpose: merged.ddPurpose || '',
                ddCourierAddress: merged.courierAddress || '',
                ddCourierHours: merged.courierDeadline || undefined,
                ddDate: merged.ddDate || merged.issueDate || '',
                ddRemarks: merged.ddRemarks || merged.remarks || '',
            };
        case 'FDR':
            return {
                fdrFavouring: merged.favouring || '',
                fdrExpiryDate: merged.fdrExpiryDate || merged.expiryDate || '',
                fdrDeliverBy: merged.fdrNeeds || '',
                fdrPurpose: merged.fdrPurpose || '',
                fdrCourierAddress: merged.courierAddress || '',
                fdrCourierHours: merged.courierDeadline || undefined,
                fdrDate: merged.fdrDate || merged.issueDate || '',
            };
        case 'BG':
            return {
                bgNeededIn: merged.bgNeeds || '',
                bgPurpose: merged.bgPurpose || '',
                bgFavouring: merged.beneficiaryName || merged.favouring || '',
                bgAddress: merged.beneficiaryAddress || '',
                bgExpiryDate: merged.bgDate || merged.validityDate || merged.expiryDate || '',
                bgClaimPeriod: merged.claimExpiryDate || '',
                bgStampValue: merged.stampCharges ? Number(merged.stampCharges) : undefined,
                bgFormatFiles: merged.bgFormatFiles || [],
                bgPoFiles: merged.bgPoFiles || [],
                bgClientUserEmail: merged.bgClientUser || '',
                bgClientCpEmail: merged.bgClientCp || '',
                bgClientFinanceEmail: merged.bgClientFin || '',
                bgCourierAddress: merged.courierAddress || '',
                bgCourierDays: merged.courierDeadline || undefined,
                bgBank: merged.bankName || '',
            };
        case 'Bank Transfer':
            return {
                btPurpose: merged.purpose || '',
                btAccountName: merged.accountName || '',
                btAccountNo: merged.accountNumber || '',
                btIfsc: merged.ifsc || '',
            };
        case 'Portal Payment':
            return {
                portalPurpose: merged.purpose || '',
                portalName: merged.portalName || '',
                portalNetBanking: merged.isNetbanking || undefined,
                portalDebitCard: merged.isDebit || undefined,
            };
        default:
            return {};
    }
}

const EMDEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Tender ID is required</AlertDescription>
            </Alert>
        );
    }

    const tenderId = Number(id);
    const { data: paymentRequests, isLoading, error } = usePaymentRequestsByTender(tenderId);

    // Map payment requests to form data structure
    const { formData, requestIds } = useMemo(() => {
        if (!paymentRequests || paymentRequests.length === 0) {
            return { formData: undefined, requestIds: undefined };
        }

        const formData: any = {
            emd: { mode: undefined, details: {} },
            tenderFee: { mode: undefined, details: {} },
            processingFee: { mode: undefined, details: {} },
        };
        const requestIds: any = {};

        paymentRequests.forEach((request: any) => {
            // Get the first active instrument
            const instrument = request.instruments?.[0];
            if (!instrument) return;

            const mode = mapInstrumentTypeToMode(instrument.instrumentType);
            const details = mapDetailsToForm(instrument.instrumentType, instrument);

            if (request.purpose === 'EMD') {
                formData.emd = { mode, details };
                requestIds.emd = request.id;
            } else if (request.purpose === 'Tender Fee') {
                formData.tenderFee = { mode, details };
                requestIds.tenderFee = request.id;
            } else if (request.purpose === 'Processing Fee') {
                formData.processingFee = { mode, details };
                requestIds.processingFee = request.id;
            }
        });

        return { formData, requestIds };
    }, [paymentRequests]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !paymentRequests || paymentRequests.length === 0) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    No payment requests found for this tender.
                    <button
                        onClick={() => navigate(`/tendering/emds-tenderfees/create/${tenderId}`)}
                        className="ml-2 text-blue-600 underline"
                    >
                        Create one instead
                    </button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <EmdTenderFeeRequestForm
            tenderId={tenderId}
            requestIds={requestIds}
            initialData={formData}
            mode="edit"
        />
    );
};

export default EMDEditPage;
