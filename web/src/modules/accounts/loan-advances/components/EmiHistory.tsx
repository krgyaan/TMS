import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, History } from 'lucide-react';
import { useLoanEmis, useDeleteEmi } from '@/hooks/api/useLoanAdvance';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';

interface EmiHistoryProps {
    loanId: number;
}

export function EmiHistory({ loanId }: EmiHistoryProps) {
    const { data: emis, isLoading } = useLoanEmis(loanId);
    const deleteEmiMutation = useDeleteEmi();

    const handleDelete = async (emiId: number) => {
        try {
            await deleteEmiMutation.mutateAsync({ emiId, loanId });
        } catch (error) {
            console.error('Error deleting EMI:', error);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    Loading EMI history...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    EMI Payment History
                    {emis && emis.length > 0 && (
                        <Badge variant="secondary">{emis.length} payments</Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {emis && emis.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Principal</TableHead>
                                    <TableHead className="text-right">Interest</TableHead>
                                    <TableHead className="text-right">TDS</TableHead>
                                    <TableHead className="text-right">Penal</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {emis.map((emi) => {
                                    const total =
                                        parseFloat(emi.principlePaid || '0') +
                                        parseFloat(emi.interestPaid || '0') +
                                        parseFloat(emi.penalChargesPaid || '0');

                                    return (
                                        <TableRow key={emi.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {formatDate(emi.emiDate)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatINR(Number(emi.principlePaid))}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatINR(Number(emi.interestPaid))}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatINR(Number(emi.tdsToBeRecovered))}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatINR(Number(emi.penalChargesPaid))}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatINR(total)}
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
                                                            <AlertDialogTitle>Delete EMI Record</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete this EMI payment record from {formatDate(emi.emiDate)}?
                                                                This will recalculate the loan aggregates.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(emi.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No EMI payments recorded yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default EmiHistory;
