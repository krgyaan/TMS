import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmdTenderFeeRequestForm } from "./components/EmdTenderFeeRequestForm";
import { useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { usePaymentRequestForEdit } from "@/hooks/api/usePaymentRequests";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function mapInstrumentTypeToMode(instrumentType: string | null): string | undefined {
    if (!instrumentType) return undefined;
    const mapping: Record<string, string> = {
        'Bank Transfer': 'BANK_TRANSFER',
        'Portal Payment': 'PORTAL',
        'DD': 'DD',
        'FDR': 'FDR',
        'BG': 'BG',
        'Cheque': 'CHEQUE',
    };
    return mapping[instrumentType];
}

const EMDEditPage = () => {
    const { id } = useParams<{ id: string }>();

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Request ID is required</AlertDescription>
            </Alert>
        );
    }

    const { data: editData, isLoading, error } = usePaymentRequestForEdit(id ? Number(id) : null);

    // Map the flattened data to the form structure
    const { formData, requestIds } = useMemo(() => {
        if (!editData) {
            return { formData: undefined, requestIds: undefined };
        }

        const mode = mapInstrumentTypeToMode(editData.mode);
        
        // Normalize purpose for mapping
        let purposeKey = 'EMD';
        if (editData.purpose === 'Tender Fee' || editData.purpose === 'TENDER_FEES') {
            purposeKey = 'TENDER_FEES';
        } else if (editData.purpose === 'Processing Fee' || editData.purpose === 'PROCESSING_FEES') {
            purposeKey = 'PROCESSING_FEES';
        }

        const formData: any = {
            requestedBy: editData.requestedBy,
            tenderNo: editData.tenderNo,
            tenderName: editData.tenderName,
            tenderDueDate: editData.tenderDueDate,
            EMD: { mode: undefined, details: {} },
            TENDER_FEES: { mode: undefined, details: {} },
            PROCESSING_FEES: { mode: undefined, details: {} },
            [purposeKey]: {
                mode,
                details: editData // The editData itself is already flattened and compatible with the Zod schema keys
            }
        };

        const requestIds: any = {
            emd: purposeKey === 'EMD' ? editData.id : undefined,
            tenderFee: purposeKey === 'TENDER_FEES' ? editData.id : undefined,
            processingFee: purposeKey === 'PROCESSING_FEES' ? editData.id : undefined,
        };

        return { formData, requestIds };
    }, [editData]);

    if (isLoading) {
        return (
            <Card className="m-6">
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !editData) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Payment request not found or could not be loaded.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    console.log("Form Data", formData);
    console.log("Request IDs", requestIds);
    return (
        <EmdTenderFeeRequestForm
            tenderId={editData.tenderId}
            requestIds={requestIds}
            initialData={formData}
            mode="edit"
        />
    );
};

export default EMDEditPage;
