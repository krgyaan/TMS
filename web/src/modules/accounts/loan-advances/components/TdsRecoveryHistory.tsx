import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, FileText, Banknote } from 'lucide-react';
import { useLoanTdsRecoveries, useDeleteTdsRecovery } from '@/hooks/api/useLoanAdvance';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate } from '@/hooks/useFormatedDate';

interface TdsRecoveryHistoryProps {
    loanId: number;
}

export function TdsRecoveryHistory({ loanId }: TdsRecoveryHistoryProps) {
    const { data: recoveries, isLoading } = useLoanTdsRecoveries(loanId);
    const deleteRecoveryMutation = useDeleteTdsRecovery();

    const handleDelete = async (recoveryId: number) => {
        try {
            await deleteRecoveryMutation.mutateAsync({ recoveryId, loanId });
        } catch (error) {
            console.error('Error deleting TDS recovery:', error);
        }
    };

    const totalRecovered = recoveries?.reduce(
        (sum, r) => sum + parseFloat(r.tdsAmount || '0'),
        0
    ) ?? 0;

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    Loading TDS recovery history...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5" />
                        TDS Recovery History
                        {recoveries && recoveries.length > 0 && (
                            <Badge variant="secondary">{recoveries.length} recoveries</Badge>
                        )}
                    </CardTitle>
                    {totalRecovered > 0 && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                            Total Recovered: {formatINR(Number(totalRecovered))}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {recoveries && recoveries.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Bank Details</TableHead>
                                    <TableHead>Documents</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recoveries.map((recovery) => (
                                    <TableRow key={recovery.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {formatDate(recovery.tdsDate)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-green-600">
                                            {formatINR(Number(recovery.tdsAmount))}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {recovery.tdsRecoveryBankDetails || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {recovery.tdsDocument && recovery.tdsDocument.length > 0 ? (
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {recovery.tdsDocument.length} file(s)
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete TDS Recovery</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete this TDS recovery record of {formatINR(Number(recovery.tdsAmount))}?
                                                            This will recalculate the loan aggregates.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(recovery.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No TDS recoveries recorded yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default TdsRecoveryHistory;
