import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { ArrowRightLeft, Users, Banknote, CheckCircle2, FileText } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
import type { BankTransferViewProps } from '../helpers/bankTransfer.types';

function SectionHeader({ title, icon: Icon }: { title: string; icon?: React.ComponentType<{ className?: string }> }) {
    return (
        <TableRow className="bg-muted/50">
            <TableCell colSpan={4} className="font-semibold text-sm py-2">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    {title}
                </div>
            </TableCell>
        </TableRow>
    );
}

function FieldRow({ label, value, fullWidth = false }: { label: string; value: React.ReactNode; fullWidth?: boolean }) {
    return (
        <TableRow className="hover:bg-muted/30 transition-colors">
            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                {label}
            </TableCell>
            <TableCell className={`text-sm ${fullWidth ? 'col-span-3' : 'w-3/4'} whitespace-normal [overflow-wrap:anywhere]`} colSpan={fullWidth ? undefined : 3}>
                {value || '—'}
            </TableCell>
        </TableRow>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <TableRow className="hover:bg-muted/30 transition-colors">
            <TableCell colSpan={4} className="text-sm text-muted-foreground italic py-2">
                {message}
            </TableCell>
        </TableRow>
    );
}

export function BankTransferView({ data, followupData }: BankTransferViewProps) {

    if (!data) {
        return null;
    }

    const isAccountsFormRejected = data.btStatus === 'Rejected';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    Bank Transfer Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Basic Information - Always shown */}
                        <SectionHeader title="Basic Information" />
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.amount ? formatINR(Number(data.amount)) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Account Name
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.accountName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell className="text-sm">
                                <Badge variant="outline">{data.btStatus || '—'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender No
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderNo || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Name
                            </TableCell>
                            <TableCell className="text-sm col-span-3">
                                {data.tenderName || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Accounts Form Section */}
                        {data.hasAccountsFormData ? (
                            <>
                                <SectionHeader title="Accounts Form" icon={FileText} />
                                {isAccountsFormRejected ? (
                                    <>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Status
                                            </TableCell>
                                            <TableCell className="text-sm col-span-3">
                                                <Badge variant="destructive">Rejected</Badge>
                                            </TableCell>
                                        </TableRow>
                                        <FieldRow label="Rejection Reason" value={data.rejectionReason} fullWidth />
                                    </>
                                ) : (
                                    <>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Status
                                            </TableCell>
                                            <TableCell className="text-sm col-span-3">
                                                <Badge variant="default">Accepted</Badge>
                                            </TableCell>
                                        </TableRow>
                                        <FieldRow label="Payment Date/Time" value={data.paymentDateTime ? formatDateTime(data.paymentDateTime) : '—'} />
                                        <FieldRow label="UTR No" value={data.utrNo} />
                                        <FieldRow label="UTR Message" value={data.utrMsg} fullWidth />
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <SectionHeader title="Accounts Form" icon={FileText} />
                                <EmptyState message="No accounts form action taken" />
                            </>
                        )}

                        {/* Initiate Followup Section */}
                        {followupData ? (
                            <>
                                <SectionHeader title="Initiate Followup" icon={Users} />
                                <FieldRow label="Organisation Name" value={followupData.organisationName || '—'} />
                                {followupData.contacts && followupData.contacts.length > 0 ? (
                                    followupData.contacts.map((contact, index) => (
                                        <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Contact {index + 1}
                                            </TableCell>
                                            <TableCell className="text-sm col-span-3">
                                                {contact.name}
                                                {contact.phone && ` - ${contact.phone}`}
                                                {contact.email && ` (${contact.email})`}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <EmptyState message="No contacts added" />
                                )}
                                <FieldRow label="Follow-up Start Date" value={followupData.followupStartDate ? formatDate(followupData.followupStartDate) : '—'} />
                                <FieldRow label="Frequency" value={followupData.frequency} />
                            </>
                        ) : (
                            <>
                                <SectionHeader title="Initiate Followup" icon={Users} />
                                <EmptyState message="No followup initiated" />
                            </>
                        )}

                        {/* Returned Section */}
                        {data.hasReturnedData ? (
                            <>
                                <SectionHeader title="Returned via Bank Transfer" icon={Banknote} />
                                <FieldRow label="Transfer Date" value={data.returnTransferDate ? formatDate(data.returnTransferDate) : '—'} />
                                <FieldRow label="Return UTR" value={data.returnUtr} fullWidth />
                            </>
                        ) : (
                            <>
                                <SectionHeader title="Returned via Bank Transfer" icon={Banknote} />
                                <EmptyState message="No return recorded" />
                            </>
                        )}

                        {/* Settled Section */}
                        {data.hasSettledData ? (
                            <>
                                <SectionHeader title="Settled with Project Account" icon={CheckCircle2} />
                                <FieldRow label="Remarks" value={data.settledRemarks || data.remarks || '—'} fullWidth />
                            </>
                        ) : (
                            <>
                                <SectionHeader title="Settled with Project Account" icon={CheckCircle2} />
                                <EmptyState message="Not settled" />
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}