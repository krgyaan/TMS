import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useActOnBgApproval, useBgApprovalDetail } from '@/hooks/api/useBankGuarantees';
import { usePaymentRequestForEdit } from '@/hooks/api/usePaymentRequests';
import { useUser, useUsers } from '@/hooks/api/useUsers';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { BANKS } from '@/modules/tendering/emds-tenderfees/constants';
import { fileUploadService } from '@/services/api/file-upload.service';
import { isAdminOrAbove } from '@/types/auth.types';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Eye,
    FileText,
    FileWarning,
    Loader2,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type ApprovalAction = 'APPROVED' | 'REJECTED' | 'INCOMPLETE';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    INCOMPLETE: 'Incomplete',
};

const PURPOSE_LABELS: Record<string, string> = {
    ADVANCE_PAYMENT: 'Advance Payment',
    SECURITY_DEPOSIT: 'Security Deposit',
    SECURITY_BOND_DEPOSIT: 'Security Bond/Deposit',
    FINANCIAL: 'Financial',
    COUNTER_GUARANTEE: 'Counter Guarantee',
    PERFORMANCE_BG: 'Performance BG',
};

const NEEDED_IN_LABELS: Record<string, string> = {
    '48': '48 Hours',
    '72': '72 Hours',
    '96': '96 Hours',
    '120': '120 Hours',
};

const URGENCY_LABELS: Record<string, string> = {
    '1': 'Same Day (Urgent)',
    '2': 'Next Day',
};

const BANK_LABELS: Record<string, string> = BANKS.reduce<Record<string, string>>((acc, bank) => {
    acc[bank.value] = bank.label;
    return acc;
}, {});

const ACTION_META: Record<
    ApprovalAction,
    { label: string; description: string; confirmLabel: string; successMessage: string }
> = {
    APPROVED: {
        label: 'Approve',
        description: 'Approving this request will notify the accounts team to proceed with the bank guarantee.',
        confirmLabel: 'Confirm Approve',
        successMessage: 'BG request approved',
    },
    REJECTED: {
        label: 'Reject',
        description: 'Rejecting this request keeps it out of the BG dashboard until it is resubmitted.',
        confirmLabel: 'Confirm Reject',
        successMessage: 'BG request rejected',
    },
    INCOMPLETE: {
        label: 'Incomplete',
        description: 'Marking this request incomplete keeps it out of the BG dashboard until it is resubmitted.',
        confirmLabel: 'Mark Incomplete',
        successMessage: 'BG request marked incomplete',
    },
};

const getStatusVariant = (status?: string | null) => {
    if (status === 'APPROVED') return 'success' as const;
    if (status === 'REJECTED') return 'destructive' as const;
    if (status === 'INCOMPLETE') return 'secondary' as const;
    return 'outline' as const;
};

const isFilled = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.length > 0;
    return true;
};

const DetailRow = ({ label, value }: { label: string; value: ReactNode }) => {
    if (!isFilled(value)) return null;
    return (
        <div className="grid grid-cols-[minmax(0,40%)_1fr] gap-3 border-b border-border/60 py-2 text-sm last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="whitespace-pre-wrap font-medium [overflow-wrap:anywhere]">{value}</span>
        </div>
    );
};

const DetailSection = ({
    title,
    hasData,
    children,
}: {
    title: string;
    hasData: boolean;
    children: ReactNode;
}) => {
    if (!hasData) return null;
    return (
        <div className="space-y-1">
            <h3 className="text-sm font-semibold">{title}</h3>
            <div>{children}</div>
        </div>
    );
};

const FileLinks = ({ paths: filePaths }: { paths?: string[] | null }) => {
    const list = (filePaths ?? []).filter((path): path is string => !!path);
    if (list.length === 0) return null;
    return (
        <div className="flex flex-col gap-1">
            {list.map((path) => (
                <a
                    key={path}
                    href={fileUploadService.getFileUrl(path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                    <Eye className="h-4 w-4" />
                    {path.split('/').pop()}
                </a>
            ))}
        </div>
    );
};

const BankGuaranteeApprovalPage = () => {
    const { instrumentId } = useParams<{ instrumentId: string }>();
    const id = instrumentId ? parseInt(instrumentId, 10) : 0;
    const navigate = useNavigate();
    const { user } = useAuth();
    const canApprove = isAdminOrAbove(user?.role?.name) || user?.role?.name === 'Team Leader';

    const { data: approval, isLoading: isApprovalLoading, error: approvalError } = useBgApprovalDetail(id);
    const requestId = approval?.requestId ? Number(approval.requestId) : 0;
    const { data: form, isLoading: isFormLoading } = usePaymentRequestForEdit(requestId || null);
    const { data: users = [] } = useUsers();
    const { data: approver } = useUser(approval?.tlApprovedBy ?? 0);
    const actOnApproval = useActOnBgApproval();

    const [mode, setMode] = useState<ApprovalAction>('APPROVED');
    const [remarks, setRemarks] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setFormError(null);
        try {
            await actOnApproval.mutateAsync({
                instrumentId: id,
                status: mode,
                remarks: remarks.trim() || undefined,
            });
            toast.success(ACTION_META[mode].successMessage);
            setRemarks('');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update the BG request';
            setFormError(message);
            toast.error(message);
        }
    };

    if (!canApprove) {
        return (
            <div className="space-y-6 p-3 sm:p-6">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Only Team Leaders and Admins can review BG requests.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const isLoading = isApprovalLoading || (requestId > 0 && isFormLoading);

    if (isLoading) {
        return (
            <div className="space-y-4 p-3 sm:p-6">
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
                    <Skeleton className="h-[70vh] w-full rounded-xl" />
                    <Skeleton className="h-[70vh] w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (approvalError || !approval) {
        return (
            <div className="space-y-6 p-3 sm:p-6">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load the BG approval request. It may have been removed or you may not have access.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const status: string = approval.tlApprovalStatus ?? 'PENDING';
    const isPending = status === 'PENDING';
    const decidedRemarks =
        approval.tlRejectedRemarks || approval.tlIncompleteRemarks || approval.tlApprovalRemarks || null;

    const amount = form?.bgAmount ?? approval.amount;
    const purpose = form?.bgPurpose ? PURPOSE_LABELS[form.bgPurpose] ?? form.bgPurpose : null;
    const courierEmployee = users.find(
        (employee) => String(employee.id) === String(form?.bgCourierEmpFrom ?? ''),
    );
    const courierFrom = courierEmployee?.name
        ?? (isFilled(form?.bgCourierEmpFrom) ? String(form?.bgCourierEmpFrom) : null);

    const hasLink = isFilled(form?.tenderName) || isFilled(form?.tenderNo) || isFilled(form?.tenderDueDate);
    const hasBgDetails =
        isFilled(purpose) ||
        isFilled(amount) ||
        isFilled(form?.bgNeededIn) ||
        isFilled(form?.bgFavouring) ||
        isFilled(form?.bgAddress) ||
        isFilled(form?.bgExpiryDate) ||
        isFilled(form?.bgClaimPeriod) ||
        isFilled(form?.bgStampValue) ||
        isFilled(form?.bgBank);
    const hasAccount =
        isFilled(form?.bgBankAccountName) ||
        isFilled(form?.bgBankAccountNo) ||
        isFilled(form?.bgBankIfsc);
    const hasEmails =
        isFilled(form?.bgClientUserEmail) ||
        isFilled(form?.bgClientCpEmail) ||
        isFilled(form?.bgClientFinanceEmail);
    const hasUnique = isFilled(form?.uniqueCode) || isFilled(form?.uniqueAdviceMessage);
    const hasCourier =
        isFilled(form?.bgCourierOrg) ||
        isFilled(form?.bgCourierName) ||
        isFilled(form?.bgCourierPhone) ||
        isFilled(form?.bgCourierAddrLine1) ||
        isFilled(form?.bgCourierAddrLine2) ||
        isFilled(form?.bgCourierCity) ||
        isFilled(form?.bgCourierState) ||
        isFilled(form?.bgCourierPincode) ||
        isFilled(courierFrom) ||
        isFilled(form?.bgCourierDelDate) ||
        isFilled(form?.bgCourierUrgency);
    const hasFiles =
        (form?.bgFormatFiles?.length ?? 0) > 0 ||
        (approval.supportingDocuments?.length ?? 0) > 0;

    return (
        <div className="p-3 sm:p-6">
            <Card className="flex flex-col gap-0 py-0 xl:h-[calc(100vh-9rem)] xl:overflow-hidden">
                <div className="border-b px-4 py-3 sm:px-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold sm:text-xl">Bank Guarantee Approval</h1>
                                    <Badge variant={getStatusVariant(status)}>
                                        {STATUS_LABELS[status] || status}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                                    Request: <strong className="text-foreground">#{approval.requestId}</strong>
                                    {purpose ? ` · ${purpose}` : ''}
                                    {isFilled(amount) ? ` · ${formatINR(Number(amount))}` : ''}
                                    {' · '}Requested By:{' '}
                                    <strong className="text-foreground">{approval.requestedByName || '—'}</strong>
                                    {approval.createdAt ? ` on ${formatDateTime(approval.createdAt)}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_440px]">
                    <Card className="flex min-h-0 flex-col gap-0 overflow-hidden py-0">
                        <CardHeader className="flex flex-row items-center gap-2 border-b py-3">
                            <FileText className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm font-semibold">BG Request Form (as submitted)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-5 overflow-y-auto pt-4">
                        {!form ? (
                            <p className="text-sm text-muted-foreground">
                                Request details are not available for this bank guarantee.
                            </p>
                        ) : (
                            <>
                                <DetailSection title="Tender / Project" hasData={hasLink}>
                                    <DetailRow
                                        label={Number(form.projectId) > 0 ? 'Project Name' : 'Tender Name'}
                                        value={form.tenderName}
                                    />
                                    <DetailRow
                                        label={Number(form.projectId) > 0 ? 'Work No.' : 'Tender No.'}
                                        value={form.tenderNo}
                                    />
                                    <DetailRow
                                        label="Due Date"
                                        value={form.tenderDueDate ? formatDate(form.tenderDueDate) : null}
                                    />
                                </DetailSection>

                                <DetailSection title="Bank Guarantee Details" hasData={hasBgDetails}>
                                    <DetailRow label="Purpose" value={purpose} />
                                    <DetailRow label="Amount" value={isFilled(amount) ? formatINR(Number(amount)) : null} />
                                    <DetailRow
                                        label="BG Needed In"
                                        value={
                                            isFilled(form.bgNeededIn)
                                                ? NEEDED_IN_LABELS[String(form.bgNeededIn)] ?? String(form.bgNeededIn)
                                                : null
                                        }
                                    />
                                    <DetailRow label="BG in Favour of" value={form.bgFavouring} />
                                    <DetailRow label="BG Address" value={form.bgAddress} />
                                    <DetailRow
                                        label="BG Expiry Date"
                                        value={form.bgExpiryDate ? formatDate(form.bgExpiryDate) : null}
                                    />
                                    <DetailRow
                                        label="BG Claim Period"
                                        value={form.bgClaimPeriod ? formatDate(form.bgClaimPeriod) : null}
                                    />
                                    <DetailRow
                                        label="Stamp Paper Value"
                                        value={isFilled(form.bgStampValue) ? formatINR(Number(form.bgStampValue)) : null}
                                    />
                                    <DetailRow label="Bank" value={form.bgBank ? BANK_LABELS[form.bgBank] ?? form.bgBank : null} />
                                </DetailSection>

                                <DetailSection title="Customer Account" hasData={hasAccount}>
                                    <DetailRow label="Account Name" value={form.bgBankAccountName} />
                                    <DetailRow label="Account Number" value={form.bgBankAccountNo} />
                                    <DetailRow label="IFSC Code" value={form.bgBankIfsc} />
                                </DetailSection>

                                <DetailSection title="Client Emails" hasData={hasEmails}>
                                    <DetailRow label="User Dept." value={form.bgClientUserEmail} />
                                    <DetailRow label="C&P Dept." value={form.bgClientCpEmail} />
                                    <DetailRow label="Finance Dept." value={form.bgClientFinanceEmail} />
                                </DetailSection>

                                <DetailSection title="Unique Details" hasData={hasUnique}>
                                    <DetailRow label="Unique Code" value={form.uniqueCode} />
                                    <DetailRow label="Unique Advice Message" value={form.uniqueAdviceMessage} />
                                </DetailSection>

                                <DetailSection title="Courier Dispatch" hasData={hasCourier}>
                                    <DetailRow label="Organization" value={form.bgCourierOrg} />
                                    <DetailRow label="Recipient" value={form.bgCourierName} />
                                    <DetailRow label="Phone" value={form.bgCourierPhone} />
                                    <DetailRow label="Address Line 1" value={form.bgCourierAddrLine1} />
                                    <DetailRow label="Address Line 2" value={form.bgCourierAddrLine2} />
                                    <DetailRow label="City" value={form.bgCourierCity} />
                                    <DetailRow label="State" value={form.bgCourierState} />
                                    <DetailRow label="Pin Code" value={form.bgCourierPincode} />
                                    <DetailRow label="Courier From" value={courierFrom} />
                                    <DetailRow
                                        label="Expected Delivery Date"
                                        value={form.bgCourierDelDate ? formatDate(form.bgCourierDelDate) : null}
                                    />
                                    <DetailRow
                                        label="Dispatch Urgency"
                                        value={
                                            isFilled(form.bgCourierUrgency)
                                                ? URGENCY_LABELS[String(form.bgCourierUrgency)] ??
                                                  String(form.bgCourierUrgency)
                                                : null
                                        }
                                    />
                                </DetailSection>

                                <DetailSection title="Attachments" hasData={hasFiles}>
                                    <DetailRow label="BG Format" value={<FileLinks paths={form.bgFormatFiles} />} />
                                    <DetailRow
                                        label={approval.supportingDocumentLabel || 'Supporting Document'}
                                        value={<FileLinks paths={approval.supportingDocuments} />}
                                    />
                                </DetailSection>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="min-h-0 space-y-4 xl:overflow-y-auto">
                    {!isPending && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between text-sm">
                                    <span>Current Decision</span>
                                    <Badge variant={getStatusVariant(status)}>
                                        {STATUS_LABELS[status] || status}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Remarks</p>
                                    <p className="whitespace-pre-wrap">{decidedRemarks || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Reviewed By</p>
                                    <p>
                                        {approver?.name ||
                                            (approval.tlApprovedBy ? `User #${approval.tlApprovedBy}` : '—')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Reviewed At</p>
                                    <p>{approval.tlApprovedAt ? formatDateTime(approval.tlApprovedAt) : '—'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {isPending && (
                        <Card className="border-primary/30 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    Team Leader Approval
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Review the request details, then choose an action.
                                </CardDescription>
                                <div className="grid grid-cols-3 gap-2 pt-2">
                                    {(['APPROVED', 'REJECTED', 'INCOMPLETE'] as ApprovalAction[]).map((action) => (
                                        <Button
                                            key={action}
                                            type="button"
                                            size="sm"
                                            variant={
                                                mode === action
                                                    ? action === 'REJECTED'
                                                        ? 'destructive'
                                                        : action === 'INCOMPLETE'
                                                            ? 'secondary'
                                                            : 'default'
                                                    : 'outline'
                                            }
                                            onClick={() => {
                                                setMode(action);
                                                setFormError(null);
                                            }}
                                            className="gap-1.5"
                                        >
                                            {action === 'APPROVED' ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : action === 'REJECTED' ? (
                                                <XCircle className="h-4 w-4" />
                                            ) : (
                                                <FileWarning className="h-4 w-4" />
                                            )}
                                            {ACTION_META[action].label}
                                        </Button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                                    {ACTION_META[mode].description}
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-sm font-medium">Remarks (optional)</p>
                                    <Textarea
                                        rows={4}
                                        placeholder={`Add any remarks for this ${ACTION_META[mode].label.toLowerCase()} decision`}
                                        value={remarks}
                                        onChange={(event) => setRemarks(event.target.value)}
                                        disabled={actOnApproval.isPending}
                                    />
                                </div>

                                {formError && (
                                    <Alert variant="destructive" className="py-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-xs">{formError}</AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    type="button"
                                    className="w-full gap-1.5"
                                    variant={
                                        mode === 'REJECTED'
                                            ? 'destructive'
                                            : mode === 'INCOMPLETE'
                                                ? 'secondary'
                                                : 'default'
                                    }
                                    disabled={actOnApproval.isPending}
                                    onClick={handleConfirm}
                                >
                                    {actOnApproval.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : mode === 'APPROVED' ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : mode === 'REJECTED' ? (
                                        <XCircle className="h-4 w-4" />
                                    ) : (
                                        <FileWarning className="h-4 w-4" />
                                    )}
                                    {ACTION_META[mode].confirmLabel}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
                </div>
            </Card>
        </div>
    );
};

export default BankGuaranteeApprovalPage;
