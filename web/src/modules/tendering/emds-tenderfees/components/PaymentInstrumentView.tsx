import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDate } from "@/hooks/useFormatedDate";
import { getStatusBadgeVariant, getReadableStatusName, BI_STATUSES } from "../constants";
import { useInstrumentDetails } from "@/hooks/api/usePaymentRequests";
import { DemandDraftView, FdrView, BankGuaranteeView, ChequeView, BankTransferView, PortalPaymentView } from "./instrument-views";

interface Instrument {
    id: number;
    instrumentType: string;
    amount: string | number;
    favouring?: string | null;
    payableAt?: string | null;
    issueDate?: string | Date | null;
    expiryDate?: string | Date | null;
    claimExpiryDate?: string | Date | null;
    status: string;
    action?: number | null;
    generatedPdf?: string | null;
    cancelPdf?: string | null;
    docketSlip?: string | null;
    coveringLetter?: string | null;
    extraPdfPaths?: string | null;
    extensionRequestPdf?: string | null;
    cancellationRequestPdf?: string | null;
    details?: any;
    utr?: string | null;
    reqNo?: string | null;
    referenceNo?: string | null;
    transferDate?: string | Date | null;
    courierAddress?: string | null;
    courierDeadline?: number | null;
}

interface PaymentInstrumentViewProps {
    paymentRequestId: number;
}

export const PaymentInstrumentView = ({ paymentRequestId }: PaymentInstrumentViewProps) => {
    const { data, isLoading, error } = useInstrumentDetails(paymentRequestId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                        No payment request found or error loading data.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { tenderId, type, tenderNo, projectName, purpose, amountRequired, status, createdAt, instruments } = data;
    const isNonTms = tenderId === 0;

    const getTypeLabel = (type?: string) => {
        switch (type) {
            case 'TMS': return 'TMS Entry';
            case 'Other Than TMS': return 'Other Than TMS';
            case 'Old Entries': return 'Old Entry';
            case 'Other Than Tender': return 'Other Than Tender';
            default: return type || 'Unknown';
        }
    };

    const groupedInstruments = instruments.reduce((acc: Record<string, Instrument[]>, instrument: Instrument) => {
        const key = instrument.instrumentType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(instrument);
        return acc;
    }, {} as Record<string, Instrument[]>);

    return (
        <div className="space-y-4">
            {isNonTms && (
                <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {getTypeLabel(type)}
                    </Badge>
                    {tenderNo && (
                        <span className="text-sm text-muted-foreground">
                            Tender No: {tenderNo}
                        </span>
                    )}
                </div>
            )}
            
            <Card>
                <CardContent className="pt-4">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">Purpose</TableCell>
                                <TableCell className="text-sm font-semibold">{purpose}</TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">Amount Required</TableCell>
                                <TableCell className="text-sm font-semibold">{formatINR(amountRequired)}</TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(status) as any}>
                                        {getReadableStatusName(status as keyof typeof BI_STATUSES)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">Created On</TableCell>
                                <TableCell className="text-sm">{formatDate(createdAt)}</TableCell>
                            </TableRow>
                            {projectName && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Project Name</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{projectName}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {Object.keys(groupedInstruments).map((instrumentType) => {
                const typeInstruments = groupedInstruments[instrumentType];
                
                switch (instrumentType) {
                    case 'DD':
                        return <DemandDraftView key={instrumentType} instruments={typeInstruments} isNonTms={isNonTms} />;
                    case 'FDR':
                        return <FdrView key={instrumentType} instruments={typeInstruments} isNonTms={isNonTms} />;
                    case 'BG':
                        return <BankGuaranteeView key={instrumentType} instruments={typeInstruments} isNonTms={isNonTms} />;
                    case 'Cheque':
                        return <ChequeView key={instrumentType} instruments={typeInstruments} isNonTms={isNonTms} />;
                    case 'Bank Transfer':
                        return <BankTransferView key={instrumentType} instruments={typeInstruments} isNonTms={isNonTms} />;
                    case 'Portal Payment':
                        return <PortalPaymentView key={instrumentType} instruments={typeInstruments} isNonTms={isNonTms} />;
                    default:
                        return (
                            <Card key={instrumentType}>
                                <CardContent className="pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Unknown instrument type: {instrumentType}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                }
            })}

            {instruments.length === 0 && (
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                            No instruments found for this payment request.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};