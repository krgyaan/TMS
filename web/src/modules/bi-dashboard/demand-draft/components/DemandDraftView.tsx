import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText, Receipt, Users, Eye } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate } from '@/hooks/useFormatedDate';
import type { DDFollowupData } from '../helpers/demandDraft.types';

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

function CourierAddressBlock({ addressJson, address }: { addressJson: Record<string, any> | null | undefined; address: string | null | undefined }) {
    if (addressJson) {
        return (
            <div className="space-y-0.5">
                <div><span className="font-medium">Name:</span> {addressJson.name || '—'}</div>
                {addressJson.phone && <div><span className="font-medium">Phone:</span> {addressJson.phone}</div>}
                <div><span className="font-medium">Address:</span> {[addressJson.line1, addressJson.line2].filter(Boolean).join(', ') || '—'}</div>
                <div>
                    {[addressJson.city, addressJson.state].filter(Boolean).join(', ')}
                    {addressJson.pincode ? ` - ${addressJson.pincode}` : ''}
                </div>
            </div>
        );
    }
    return <pre className="whitespace-pre-wrap">{address || '—'}</pre>;
}

function CourierDetailsBlock({ details }: { details: any }) {
    if (!details) return <span className="text-muted-foreground italic">Not available</span>;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    return (
        <div className="space-y-0.5">
            <div><span className="font-medium">Organisation:</span> {details.toOrg || '—'}</div>
            <div><span className="font-medium">Contact:</span> {details.toName || '—'} {details.toMobile ? `(${details.toMobile})` : ''}</div>
            <div><span className="font-medium">Address:</span> {details.toAddr || '—'} {details.toPin ? `- ${details.toPin}` : ''}</div>
            <div><span className="font-medium">Provider:</span> {details.courierProvider || '—'}</div>
            <div><span className="font-medium">Status:</span> {details.courierStatusName || details.status || '—'}</div>
            {details.trackingNumber && <div><span className="font-medium">Tracking:</span> {details.trackingNumber}</div>}
            {details.docketNo && <div><span className="font-medium">Docket No:</span> {details.docketNo}</div>}
            {details.docketSlip && (
                <div>
                    <span className="font-medium">Docket Slip:</span>{' '}
                    <a href={`${apiUrl}/tender-files/serve/${details.docketSlip}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View
                    </a>
                </div>
            )}
            {details.deliveryPod && (
                <div>
                    <span className="font-medium">Proof of Delivery:</span>{' '}
                    <a href={`${apiUrl}/tender-files/serve/${details.deliveryPod}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View
                    </a>
                </div>
            )}
            {details.deliveryDate && <div><span className="font-medium">Delivery Date:</span> {formatDate(details.deliveryDate)}</div>}
        </div>
    );
}

interface DemandDraftViewProps {
    data: any;
    followupData?: DDFollowupData | null;
    isLoading?: boolean;
    className?: string;
}

export function DemandDraftView({
    data,
    followupData,
    className = '',
}: DemandDraftViewProps) {
    console.log("Demand Draft: ", data);
    if (!data) {
        return null;
    }

    const status = data.ddStatus || data.status || null;
    const hasAccountsFormData = data.hasAccountsFormData === true;
    const isAccountsFormRejected = data.ddStatus === 'Rejected' || data.status === 'Rejected';

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Demand Draft Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Request Form Information */}
                        <SectionHeader title="Request Form" />
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.amount ? formatINR(Number(data.amount)) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell className="text-sm">
                                <Badge variant="outline">{status || '—'}</Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                DD Purpose
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.ddPurpose || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                DD Needed In
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.ddNeeds || '—'} Hours
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Favouring
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                {data.favouring || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Payable At
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.payableAt || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Issue Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.issueDate ? formatDate(data.issueDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Requested By
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestedByName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Courier Address
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={3}>
                                <CourierAddressBlock addressJson={data.courierAddressJson} address={data.courierAddress} />
                            </TableCell>
                        </TableRow>
                        {data.requestRemarks && (
                            <FieldRow label="Request Remarks" value={data.requestRemarks} fullWidth />
                        )}

                        {/* Accounts Form */}
                        {hasAccountsFormData || data.ddNo ? (
                            <>
                                <SectionHeader title="Accounts Form" icon={FileText} />
                                {isAccountsFormRejected ? (
                                    <>
                                        <FieldRow
                                            label="Status"
                                            value={<Badge variant="destructive">Rejected</Badge>}
                                        />
                                        <FieldRow label="Rejection Reason" value={data.rejectionReason || data.ddRemarks} fullWidth />
                                    </>
                                ) : (
                                    <>
                                        <FieldRow
                                            label="Status"
                                            value={<Badge variant="default">Accepted</Badge>}
                                        />
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                DD No
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                {data.ddNo || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                DD Date
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {data.ddDate ? formatDate(data.ddDate) : '—'}
                                            </TableCell>
                                        </TableRow>
                                        <FieldRow label="Courier Req No" value={data.reqNo} />
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Courier Details
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={3}>
                                                <CourierDetailsBlock details={data.courierDetails} />
                                            </TableCell>
                                        </TableRow>
                                        <FieldRow label="Remarks" value={data.ddRemarks} fullWidth />
                                    </>
                                )}
                            </>
                        ) : null}

                        {/* Initiate Followup */}
                        {followupData ? (
                            <>
                                <SectionHeader title="Initiate Followup" icon={Users} />
                                <FieldRow label="Organisation Name" value={followupData.organisationName || '—'} />
                                {followupData.contacts && followupData.contacts.length > 0 ? (
                                    followupData.contacts.map((contact: any, index: number) => (
                                        <FieldRow
                                            key={index}
                                            label={`Contact ${index + 1}`}
                                            value={`${contact.name}${contact.phone ? ` - ${contact.phone}` : ''}${contact.email ? ` (${contact.email})` : ''}`}
                                        />
                                    ))
                                ) : (
                                    <EmptyState message="No contacts added" />
                                )}
                                <FieldRow label="Follow-up Start Date" value={followupData.followupStartDate ? formatDate(followupData.followupStartDate) : '—'} />
                                <FieldRow label="Frequency" value={followupData.frequency} />
                            </>
                        ) : null}
                    </TableBody>
                </Table>

                {/* Linked Cheque */}
                {data.linkedCheque && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Receipt className="h-4 w-4" />
                            Linked Cheque
                        </h4>
                        <Table>
                            <TableBody>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Cheque No</TableCell>
                                    <TableCell className="text-sm font-semibold">{data.linkedCheque.chequeNo || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Cheque Date</TableCell>
                                    <TableCell className="text-sm">{data.linkedCheque.chequeDate ? formatDate(data.linkedCheque.chequeDate) : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Bank Name</TableCell>
                                    <TableCell className="text-sm">{data.linkedCheque.bankName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount</TableCell>
                                    <TableCell className="text-sm font-semibold">{data.linkedCheque.amount ? formatINR(Number(data.linkedCheque.amount)) : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                                    <TableCell><Badge variant="outline">{data.linkedCheque.status || '—'}</Badge></TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Favouring</TableCell>
                                    <TableCell className="text-sm">{data.linkedCheque.favouring || '—'}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
