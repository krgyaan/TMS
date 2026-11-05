import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ArrowLeft, Receipt } from 'lucide-react';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import type { FixedExpenseResponse } from '../helpers/fixedExpense.types';
import {
    FIXED_EXPENSE_TYPE_LABELS,
    FIXED_EXPENSE_FREQUENCY_LABELS,
    FIXED_EXPENSE_PAYMENT_MODE_LABELS,
    FIXED_EXPENSE_AMOUNT_TYPE_LABELS,
    getFixedExpenseDisplayStatus,
} from '../helpers/fixedExpense.types';

interface FixedExpenseViewProps {
    fixedExpense: FixedExpenseResponse;
}

const labelClass = 'text-sm font-medium text-muted-foreground w-1/4';
const valueClass = 'text-sm w-1/4';

const FixedExpenseView = ({ fixedExpense }: FixedExpenseViewProps) => {
    const navigate = useNavigate();
    const isBankTransfer = fixedExpense.paymentMode === 'bank_transfer';
    const statusDisplay = getFixedExpenseDisplayStatus(fixedExpense);

    return (
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
                            <TableCell className={labelClass}>Maker Request</TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {fixedExpense.makerRequestNo ? (
                                    <span className="font-mono">
                                        {fixedExpense.makerRequestNo}
                                    </span>
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
    );
};

export default FixedExpenseView;
