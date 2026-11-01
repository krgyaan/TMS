import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pencil, Receipt, Landmark, Archive } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useAuth } from '@/contexts/AuthContext';
import type { FixedExpenseResponse } from '../helpers/fixedExpense.types';
import {
    FIXED_EXPENSE_TYPE_LABELS,
    FIXED_EXPENSE_FREQUENCY_LABELS,
    FIXED_EXPENSE_PAYMENT_MODE_LABELS,
    FIXED_EXPENSE_AMOUNT_TYPE_LABELS,
} from '../helpers/fixedExpense.types';

interface DetailItemProps {
    label: string;
    value: React.ReactNode;
    className?: string;
}

const DetailItem = ({ label, value, className = '' }: DetailItemProps) => (
    <div className={`space-y-1 ${className}`}>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value || '—'}</p>
    </div>
);

interface FixedExpenseViewProps {
    fixedExpense: FixedExpenseResponse;
}

const FixedExpenseView = ({ fixedExpense }: FixedExpenseViewProps) => {
    const navigate = useNavigate();
    const { canUpdate } = useAuth();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-6 w-6" />
                            Fixed Expense Details
                        </CardTitle>
                        <CardDescription className="mt-2">
                            View complete fixed expense information
                        </CardDescription>
                    </div>
                    <CardAction className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        {canUpdate('accounts.fixed-expenses') && (
                            <Button
                                onClick={() =>
                                    navigate(paths.accounts.fixedExpenseEdit(fixedExpense.id))
                                }
                            >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                    </CardAction>
                </div>
            </CardHeader>

            <CardContent className="space-y-8">
                {/* Status Banner */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Badge
                                variant={fixedExpense.deleteStatus ? 'secondary' : 'default'}
                                className="gap-1 text-sm"
                            >
                                {fixedExpense.deleteStatus && <Archive className="h-3 w-3" />}
                                {fixedExpense.deleteStatus ? 'Archived' : 'Active'}
                            </Badge>
                        </div>
                        <Badge variant="outline" className="text-sm">
                            {FIXED_EXPENSE_TYPE_LABELS[fixedExpense.type] ?? fixedExpense.type}
                        </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Expense ID:{' '}
                        <span className="font-mono font-semibold">#{fixedExpense.id}</span>
                    </div>
                </div>

                {/* Expense Information */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Expense Information</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem label="Party Name" value={fixedExpense.partyName} />
                        <DetailItem
                            label="Type"
                            value={FIXED_EXPENSE_TYPE_LABELS[fixedExpense.type] ?? fixedExpense.type}
                        />
                        <DetailItem
                            label="Amount"
                            value={
                                <span className="flex items-center gap-2">
                                    {formatINR(fixedExpense.amount)}
                                    <Badge variant="outline">
                                        {FIXED_EXPENSE_AMOUNT_TYPE_LABELS[fixedExpense.amountType] ??
                                            fixedExpense.amountType}
                                    </Badge>
                                </span>
                            }
                        />
                        <DetailItem label="Due Date" value={formatDate(fixedExpense.dueDate)} />
                        <DetailItem
                            label="Payment Frequency"
                            value={
                                FIXED_EXPENSE_FREQUENCY_LABELS[fixedExpense.paymentFrequency] ??
                                fixedExpense.paymentFrequency
                            }
                        />
                    </div>
                </div>

                <Separator />

                {/* Payment Information */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Payment Information</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem
                            label="Payment Mode"
                            value={
                                FIXED_EXPENSE_PAYMENT_MODE_LABELS[fixedExpense.paymentMode] ??
                                fixedExpense.paymentMode
                            }
                        />
                        {fixedExpense.paymentMode === 'bank_transfer' && (
                            <>
                                <DetailItem
                                    label="Account Name"
                                    value={fixedExpense.accountName}
                                />
                                <DetailItem
                                    label="Account Number"
                                    value={fixedExpense.accountNumber}
                                />
                                <DetailItem label="IFSC Code" value={fixedExpense.ifscCode} />
                            </>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Audit Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Audit Information</h3>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem
                            label="Created By"
                            value={fixedExpense.createdByName ?? `#${fixedExpense.createdBy}`}
                        />
                        <DetailItem
                            label="Created At"
                            value={formatDateTime(fixedExpense.createdAt)}
                        />
                        <DetailItem
                            label="Last Updated"
                            value={formatDateTime(fixedExpense.updatedAt)}
                        />
                        <DetailItem
                            label="Maker"
                            value={
                                fixedExpense.makerName ??
                                (fixedExpense.makerId ? `#${fixedExpense.makerId}` : '—')
                            }
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FixedExpenseView;
