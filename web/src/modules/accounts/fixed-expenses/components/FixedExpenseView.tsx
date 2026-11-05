import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, History, Receipt } from 'lucide-react';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import type { FixedExpenseHistoryRow, FixedExpenseResponse } from '../helpers/fixedExpense.types';
import {
    FIXED_EXPENSE_TYPE_LABELS,
    FIXED_EXPENSE_FREQUENCY_LABELS,
    FIXED_EXPENSE_PAYMENT_MODE_LABELS,
    FIXED_EXPENSE_AMOUNT_TYPE_LABELS,
    getFixedExpenseDisplayStatus,
} from '../helpers/fixedExpense.types';

interface FixedExpenseViewProps {
    fixedExpense: FixedExpenseResponse;
    history: FixedExpenseHistoryRow[];
    isHistoryLoading?: boolean;
}

const labelClass = 'text-sm font-medium text-muted-foreground w-1/4';
const valueClass = 'text-sm w-1/4';

const FixedExpenseView = ({ fixedExpense, history, isHistoryLoading = false }: FixedExpenseViewProps) => {
    const navigate = useNavigate();
    const isBankTransfer = fixedExpense.paymentMode === 'bank_transfer';
    const statusDisplay = getFixedExpenseDisplayStatus(fixedExpense);

    return (
        <div className="space-y-4">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Fixed Expense Details
                        <span className="text-sm font-normal text-muted-foreground">
                            #{fixedExpense.id}
                        </span>
                    </CardTitle>
                    <CardAction className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Expense Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Expense Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className={labelClass}>Party Name</TableCell>
                            <TableCell className="text-sm font-semibold">
                                {fixedExpense.partyName || '—'}
                            </TableCell>
                            <TableCell className={labelClass}>Type</TableCell>
                            <TableCell className={valueClass}>
                                <Badge variant="secondary">
                                    {FIXED_EXPENSE_TYPE_LABELS[fixedExpense.type] ??
                                        fixedExpense.type}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className={labelClass}>Amount</TableCell>
                            <TableCell className="text-sm font-semibold">
                                <span className="flex items-center gap-2">
                                    {fixedExpense.amountType === 'variable' &&
                                    Number(fixedExpense.amount) === 0
                                        ? '—'
                                        : formatINR(fixedExpense.amount)}
                                    <Badge variant="outline">
                                        {FIXED_EXPENSE_AMOUNT_TYPE_LABELS[fixedExpense.amountType] ??
                                            fixedExpense.amountType}
                                    </Badge>
                                </span>
                            </TableCell>
                            <TableCell className={labelClass}>Status</TableCell>
                            <TableCell className={valueClass}>
                                <Badge variant="outline" className={statusDisplay.className}>
                                    {statusDisplay.label}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className={labelClass}>Due Date</TableCell>
                            <TableCell className="text-sm">
                                {formatDate(fixedExpense.dueDate)}
                            </TableCell>
                            <TableCell className={labelClass}>Payment Frequency</TableCell>
                            <TableCell className={valueClass}>
                                <Badge variant="secondary">
                                    {FIXED_EXPENSE_FREQUENCY_LABELS[
                                        fixedExpense.paymentFrequency
                                    ] ?? fixedExpense.paymentFrequency}
                                </Badge>
                            </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className={labelClass}>Maker Requests</TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {fixedExpense.cyclesTotal > 0 ? (
                                    <div className="space-y-1">
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono font-semibold ${
                                                fixedExpense.cyclesPaid === fixedExpense.cyclesTotal
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}
                                        >
                                            {fixedExpense.cyclesPaid}/{fixedExpense.cyclesTotal}
                                        </span>
                                        {fixedExpense.cycleRequestNos.length > 0 && (
                                            <div className="text-xs text-muted-foreground font-mono">
                                                {fixedExpense.cycleRequestNos.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    '—'
                                )}
                            </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className={labelClass}>Payment Mode</TableCell>
                            <TableCell className="text-sm" colSpan={isBankTransfer ? 1 : 3}>
                                <Badge variant="outline">
                                    {FIXED_EXPENSE_PAYMENT_MODE_LABELS[
                                        fixedExpense.paymentMode
                                    ] ?? fixedExpense.paymentMode}
                                </Badge>
                            </TableCell>
                            {isBankTransfer && (
                                <>
                                    <TableCell className={labelClass}>Account Name</TableCell>
                                    <TableCell className="text-sm">
                                        {fixedExpense.accountName || '—'}
                                    </TableCell>
                                </>
                            )}
                        </TableRow>
                        {isBankTransfer && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className={labelClass}>Account Number</TableCell>
                                <TableCell className="text-sm">
                                    {fixedExpense.accountNumber || '—'}
                                </TableCell>
                                <TableCell className={labelClass}>IFSC Code</TableCell>
                                <TableCell className="text-sm">
                                    {fixedExpense.ifscCode || '—'}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Audit Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Audit Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className={labelClass}>Created By</TableCell>
                            <TableCell className="text-sm">
                                {fixedExpense.createdByName ?? `#${fixedExpense.createdBy}`}
                            </TableCell>
                            <TableCell className={labelClass}>Created At</TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(fixedExpense.createdAt)}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className={labelClass}>Last Updated</TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {formatDateTime(fixedExpense.updatedAt)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Payment History
                </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                {isHistoryLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Loading history…</p>
                ) : history.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No payment history yet.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Maker Request</TableHead>
                                <TableHead>MR Status</TableHead>
                                <TableHead>Last Activity</TableHead>
                                <TableHead>Approved By</TableHead>
                                <TableHead>Updated By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((row) => {
                                const cycleStatus = getFixedExpenseDisplayStatus({ status: row.status });
                                const isZeroVariable = row.amountType === 'variable' && Number(row.amount) === 0;

                                return (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-sm font-medium">{row.cycle}</TableCell>
                                        <TableCell className="text-sm whitespace-nowrap">{formatDate(row.dueDate)}</TableCell>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {isZeroVariable ? '—' : formatINR(row.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`h-5 px-2 ${cycleStatus.className}`}>
                                                {cycleStatus.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-mono whitespace-nowrap">
                                            {row.makerRequestNo ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm capitalize whitespace-nowrap">
                                            {row.makerRequestStatus
                                                ? row.makerRequestStatus.replaceAll('_', ' ')
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {formatDateTime(row.updatedAt)}
                                        </TableCell>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {row.approvedByName ?? (row.approvedBy ? `#${row.approvedBy}` : '—')}
                                        </TableCell>
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {row.updatedByName ?? (row.updatedBy ? `#${row.updatedBy}` : '—')}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
        </div>
    );
};

export default FixedExpenseView;
