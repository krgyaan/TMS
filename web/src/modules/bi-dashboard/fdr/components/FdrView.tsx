import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Wallet, Receipt, Shield, Users, FileText, Eye } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
import { fileUploadService } from '@/services/api/file-upload.service';
import type { FDRFollowupData } from '../helpers/fdr.types';

const docUrl = (doc: string): string =>
    doc.includes("/") ? fileUploadService.getFileUrl(doc) : `/uploads/courier/${doc}`;

const toDocList = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string');
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.filter((entry): entry is string => typeof entry === 'string');
            }
        } catch {
            // Not JSON — treat as a single path.
        }
        return [value];
    }
    return [];
};

const fileNameFromPath = (path: string): string => {
    const name = path.split('/').pop() || path;
    try {
        return decodeURIComponent(name);
    } catch {
        return name;
    }
};

function DocumentLinks({ paths }: { paths: string[] }) {
    if (paths.length === 0) return <>—</>;
    return (
        <div className="space-y-1">
            {paths.map((path, index) => (
                <a
                    key={`${path}-${index}`}
                    href={fileUploadService.getFileUrl(path)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                    <Eye className="h-3 w-3" /> {fileNameFromPath(path)}
                </a>
            ))}
        </div>
    );
}

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
    return <>{address || '—'}</>;
}

function CourierDetailsBlock({ details }: { details: any }) {
    if (!details) return <span className="text-muted-foreground italic">Not available</span>;
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
                    <a href={docUrl(details.docketSlip)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View
                    </a>
                </div>
            )}
            {details.deliveryPod && (
                <div>
                    <span className="font-medium">Proof of Delivery:</span>{' '}
                    <a href={docUrl(details.deliveryPod)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View
                    </a>
                </div>
            )}
            {details.deliveryDate && <div><span className="font-medium">Delivery Date:</span> {formatDate(details.deliveryDate)}</div>}
        </div>
    );
}

interface FdrViewProps {
    data: any;
    followupData?: FDRFollowupData | null;
    isLoading?: boolean;
    className?: string;
}

export function FdrView({
    data,
    followupData,
    className = '',
}: FdrViewProps) {
    if (!data) {
        return null;
    }

    const deriveFdrStatus = (s: string | null, fdrNo?: string | null): string => {
        const map: Record<string, string> = {
            PENDING: 'Pending',
            ACCOUNTS_FORM_ACCEPTED: fdrNo ? 'FDR Created' : 'FDR Accepted',
            ACCOUNTS_FORM_REJECTED: 'FDR Rejected',
            FOLLOWUP_INITIATED: 'Followup Initiated',
            RETURN_VIA_COURIER: 'Returned via courier',
            RETURN_VIA_BANK_TRANSFER: 'Returned via Bank Transfer',
            SETTLED_WITH_PROJECT: 'Settled with Project Account',
            CANCELLATION_REQUESTED: 'FDR Cancellation request sent to branch',
            CANCELLED: 'FDR Cancelled at Branch',
        };
        return map[s as string] || s || 'Pending';
    };

    const deriveFdrExpiryStatus = (fdrExpiryDate: string | null): string => {
        if (!fdrExpiryDate) return 'No date';
        return new Date(fdrExpiryDate) < new Date() ? 'Renewed' : 'Valid';
    };

    const isFollowupStopped = Boolean(
        followupData?.stopReason != null || followupData?.stopRemarks,
    );
    const status = isFollowupStopped && (data.fdrStatus === 'FOLLOWUP_INITIATED' || data.status === 'FOLLOWUP_INITIATED')
        ? 'Followup Stopped'
        : deriveFdrStatus(data.fdrStatus || data.status, data.fdrNo);
    const hasAccountsFormData = data.hasAccountsFormData === true;
    const isAccountsFormRejected = (data.fdrStatus === 'ACCOUNTS_FORM_REJECTED' || data.status === 'ACCOUNTS_FORM_REJECTED');
    const expiryStatus = data.fdrExpiryDate ? deriveFdrExpiryStatus(data.fdrExpiryDate) : data.expiryDate ? deriveFdrExpiryStatus(data.expiryDate) : null;
    const roi = data.roi ?? data.fdrRoi;
    const bankMailIds = toDocList(data.bankMailIds);
    const bankMailIdsCc = toDocList(data.bankMailIdsCc);
    const prefilledSignedDocs = toDocList(data.prefilledSignedFdr);
    const uploadDocumentDocs = toDocList(data.uploadDocuments);
    const fdrCopyDocs = toDocList(data.fdrCopy);
    const envelopeSlipDocs = toDocList(data.envelopeSlip);

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    FDR Details
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
                                <Badge variant="outline">{status}</Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                FDR Purpose
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.fdrPurpose || data.purpose || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Favouring
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.favouring || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                FDR Needs
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.fdrNeeds || '—'}
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
                                FDR Source
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.fdrSource || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                ROI
                            </TableCell>
                            <TableCell className="text-sm">
                                {roi != null ? `${Number(roi)}%` : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Margin Percent
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.marginPercent ? `${Number(data.marginPercent)}%` : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Expiry Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {expiryStatus === 'No date' ? (
                                    <Badge variant="secondary">No date</Badge>
                                ) : expiryStatus === 'Renewed' ? (
                                    <Badge variant="outline">{expiryStatus}</Badge>
                                ) : expiryStatus ? (
                                    <Badge variant="default">{expiryStatus}</Badge>
                                ) : '—'}
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
                                Docket No
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.docketNo || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Requested By
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.requestedByName || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderStatusName || '—'}
                            </TableCell>
                        </TableRow>
                        <FieldRow
                            label="Requested Date"
                            value={data.requestCreatedAt ? formatDateTime(data.requestCreatedAt) : '—'}
                            fullWidth
                        />
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Delivery Method
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.deliverBy || '—'}
                            </TableCell>
                            <TableCell colSpan={2} />
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Name
                            </TableCell>
                            <TableCell className="text-sm col-span-3">
                                {data.tenderName || data.projectName || 'Accounts/Admin'}
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
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Courier Details
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={3}>
                                <CourierDetailsBlock details={data.courierDetails} />
                            </TableCell>
                        </TableRow>
                        {data.requestRemarks && (
                            <FieldRow label="Request Remarks" value={data.requestRemarks} fullWidth />
                        )}

                        {/* Accounts Form */}
                        {hasAccountsFormData || data.fdrNo ? (
                            <>
                                <SectionHeader title="Accounts Form" icon={FileText} />
                                {isAccountsFormRejected ? (
                                    <>
                                        <FieldRow
                                            label="Status"
                                            value={<Badge variant="destructive">FDR Rejected</Badge>}
                                        />
                                        <FieldRow label="Rejection Reason" value={data.rejectionReason || data.fdrRemark} fullWidth />
                                    </>
                                ) : (
                                    <>
                                        <FieldRow
                                            label="Status"
                                            value={<Badge variant="default">{data.fdrNo ? 'FDR Created' : 'FDR Accepted'}</Badge>}
                                        />
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                FDR No
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                {data.fdrNo || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                FDR Date
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {data.fdrDate ? formatDate(data.fdrDate) : '—'}
                                            </TableCell>
                                        </TableRow>
                                        <FieldRow label="Courier Req No" value={data.reqNo} />
                                        <FieldRow label="UTR" value={data.utr} />
                                        <FieldRow
                                            label="Bank Mail Ids"
                                            value={bankMailIds.length > 0 ? bankMailIds.join(', ') : '—'}
                                            fullWidth
                                        />
                                        <FieldRow
                                            label="Bank Mail Ids CC"
                                            value={bankMailIdsCc.length > 0 ? bankMailIdsCc.join(', ') : '—'}
                                            fullWidth
                                        />
                                        <FieldRow label="Remarks" value={data.fdrRemark} fullWidth />
                                    </>
                                )}
                            </>
                        ) : null}

                        {/* Documents */}
                        {(prefilledSignedDocs.length > 0 || uploadDocumentDocs.length > 0 || fdrCopyDocs.length > 0 || envelopeSlipDocs.length > 0) && (
                            <>
                                <SectionHeader title="Documents" icon={FileText} />
                                <FieldRow
                                    label="Bank Form, Signed by CEO"
                                    value={<DocumentLinks paths={prefilledSignedDocs} />}
                                    fullWidth
                                />
                                <FieldRow
                                    label="Request Letter, Signed by CEO"
                                    value={<DocumentLinks paths={uploadDocumentDocs} />}
                                    fullWidth
                                />
                                <FieldRow
                                    label="FDR Copy"
                                    value={<DocumentLinks paths={fdrCopyDocs} />}
                                    fullWidth
                                />
                                <FieldRow
                                    label="Envelope Slip (Generated)"
                                    value={<DocumentLinks paths={envelopeSlipDocs} />}
                                    fullWidth
                                />
                            </>
                        )}

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

                {/* Linked BG */}
                {data.linkedBg && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Linked Bank Guarantee
                        </h4>
                        <Table>
                            <TableBody>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">BG No</TableCell>
                                    <TableCell className="text-sm font-semibold">{data.linkedBg.bgNo || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">BG Date</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.bgDate ? formatDate(data.linkedBg.bgDate) : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Bank Name</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.bankName || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Beneficiary</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.beneficiaryName || '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount</TableCell>
                                    <TableCell className="text-sm font-semibold">{data.linkedBg.amount ? formatINR(Number(data.linkedBg.amount)) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                                    <TableCell><Badge variant="outline">{data.linkedBg.status || '—'}</Badge></TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Validity Date</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.validityDate ? formatDate(data.linkedBg.validityDate) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Claim Expiry</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.claimExpiryDate ? formatDate(data.linkedBg.claimExpiryDate) : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Cash Margin %</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.cashMarginPercent != null ? `${data.linkedBg.cashMarginPercent}%` : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">FDR Margin %</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.fdrMarginPercent != null ? `${data.linkedBg.fdrMarginPercent}%` : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Stamp Charges</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.stampCharges != null ? formatINR(Number(data.linkedBg.stampCharges)) : '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">SFMS Charges</TableCell>
                                    <TableCell className="text-sm">{data.linkedBg.sfmsCharges != null ? formatINR(Number(data.linkedBg.sfmsCharges)) : '—'}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Bank Account</TableCell>
                                    <TableCell className="text-sm font-mono">{data.linkedBg.bgBankAcc || '—'}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Bank IFSC</TableCell>
                                    <TableCell className="text-sm font-mono">{data.linkedBg.bgBankIfsc || '—'}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
