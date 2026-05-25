import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useContractAgreementByWoId } from "@/hooks/api/useContractAgreement";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { AlertCircle, CheckCircle2, FileText, XCircle } from "lucide-react";

interface ContractAgreementSectionProps {
    woDetailId: number;
}

export function ContractAgreementSection({ woDetailId }: ContractAgreementSectionProps) {
    const { data, isLoading, error } = useContractAgreementByWoId(woDetailId);

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load contract agreement details.</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    if (!data) {
        return <p className="text-sm text-muted-foreground italic">No contract agreement uploaded.</p>;
    }

    return (
        <Table>
            <TableBody>
                <TableRow>
                    <TableCell className="font-medium text-muted-foreground w-1/4">Status</TableCell>
                    <TableCell>
                        <Badge variant={data.status === 'uploaded' ? 'default' : 'secondary'}>
                            {data.status === 'uploaded' ? 'Uploaded' : 'Not Uploaded'}
                        </Badge>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium text-muted-foreground">VE Signed</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            {data.veSigned ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{data.veSigned}</span>
                                    {data.veSignedDate && (
                                        <span className="text-xs text-muted-foreground">({formatDateTime(data.veSignedDate)})</span>
                                    )}
                                </>
                            ) : (
                                <span className="flex items-center gap-2 text-muted-foreground italic">
                                    <XCircle className="h-4 w-4" />
                                    Not signed
                                </span>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell className="font-medium text-muted-foreground">Client & VE Signed</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            {data.clientAndVeSigned ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{data.clientAndVeSigned}</span>
                                    {data.clientAndVeSignedDate && (
                                        <span className="text-xs text-muted-foreground">({formatDateTime(data.clientAndVeSignedDate)})</span>
                                    )}
                                </>
                            ) : (
                                <span className="flex items-center gap-2 text-muted-foreground italic">
                                    <XCircle className="h-4 w-4" />
                                    Not signed
                                </span>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
