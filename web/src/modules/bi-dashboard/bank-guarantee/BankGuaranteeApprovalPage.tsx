import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useActOnBgApproval, useBgApprovalDetail } from '@/hooks/api/useBankGuarantees';
import { useUser } from '@/hooks/api/useUsers';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { isAdminOrAbove } from '@/types/auth.types';
import { AlertCircle, ArrowLeft, CheckCircle2, FileWarning, Shield, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BankGuaranteeView } from './components/BankGuaranteeView';

type ApprovalStatus = 'APPROVED' | 'REJECTED' | 'INCOMPLETE';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    INCOMPLETE: 'Incomplete',
};

const getStatusVariant = (status?: string | null) => {
    if (status === 'APPROVED') return 'success' as const;
    if (status === 'REJECTED') return 'destructive' as const;
    if (status === 'INCOMPLETE') return 'secondary' as const;
    return 'outline' as const;
};

const ACTION_META: Record<
    ApprovalStatus,
    { title: string; description: string; confirmLabel: string; successMessage: string }
> = {
    APPROVED: {
        title: 'Approve BG Request',
        description: 'Approving this request will notify the accounts team to proceed with the bank guarantee.',
        confirmLabel: 'Approve',
        successMessage: 'BG request approved',
    },
    REJECTED: {
        title: 'Reject BG Request',
        description: 'Rejecting this request keeps it out of the BG dashboard until it is resubmitted.',
        confirmLabel: 'Reject',
        successMessage: 'BG request rejected',
    },
    INCOMPLETE: {
        title: 'Mark BG Request Incomplete',
        description: 'Marking this request incomplete keeps it out of the BG dashboard until it is resubmitted.',
        confirmLabel: 'Mark Incomplete',
        successMessage: 'BG request marked incomplete',
    },
};

const BankGuaranteeApprovalPage = () => {
    const { instrumentId } = useParams<{ instrumentId: string }>();
    const id = instrumentId ? parseInt(instrumentId, 10) : 0;
    const navigate = useNavigate();
    const { user } = useAuth();
    const canApprove = isAdminOrAbove(user?.role?.name) || user?.role?.name === 'Team Leader';

    const { data, isLoading, error } = useBgApprovalDetail(id);
    const { data: approver } = useUser(data?.tlApprovedBy ?? 0);
    const actOnApproval = useActOnBgApproval();

    const [dialog, setDialog] = useState<{ status: ApprovalStatus; remarks: string } | null>(null);

    const handleConfirm = async () => {
        if (!dialog) return;
        try {
            await actOnApproval.mutateAsync({
                instrumentId: id,
                status: dialog.status,
                remarks: dialog.remarks.trim() || undefined,
            });
            toast.success(ACTION_META[dialog.status].successMessage);
            setDialog(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update the BG request');
        }
    };

    if (!canApprove) {
        return (
            <div className="space-y-6">
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

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="space-y-6">
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

    const status: string = data.tlApprovalStatus ?? 'PENDING';
    const isPending = status === 'PENDING';
    const decidedRemarks = data.tlRejectedRemarks || data.tlIncompleteRemarks || data.tlApprovalRemarks || null;
    const projectOrTender = data.projectName || data.tenderName || '—';

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Bank Guarantee Approval
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Request ID</p>
                        <p className="text-sm font-semibold">{data.requestId ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Instrument ID</p>
                        <p className="text-sm font-semibold">{data.instrumentId ?? id}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Requested By</p>
                        <p className="text-sm font-semibold">{data.requestedByName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Request Date</p>
                        <p className="text-sm font-semibold">
                            {data.requestCreatedAt ? formatDateTime(data.requestCreatedAt) : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">
                            {Number(data.projectId) > 0 ? 'Project' : 'Tender'}
                        </p>
                        <p className="text-sm font-semibold">{projectOrTender}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Amount</p>
                        <p className="text-sm font-semibold">{data.amount ? formatINR(Number(data.amount)) : '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Purpose</p>
                        <p className="text-sm font-semibold">{data.bgPurpose || data.requestPurpose || data.purpose || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Approval Status</p>
                        <Badge variant={getStatusVariant(status)}>{STATUS_LABELS[status] || status}</Badge>
                    </div>
                </CardContent>
            </Card>

            <BankGuaranteeView data={data} />

            <Card>
                <CardHeader>
                    <CardTitle>Approval Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isPending ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Review the request details above, then approve it or send it back.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={() => setDialog({ status: 'APPROVED', remarks: '' })}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => setDialog({ status: 'REJECTED', remarks: '' })}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setDialog({ status: 'INCOMPLETE', remarks: '' })}
                                >
                                    <FileWarning className="h-4 w-4 mr-2" />
                                    Incomplete
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">Status</span>
                                <Badge variant={getStatusVariant(status)}>{STATUS_LABELS[status] || status}</Badge>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Remarks</p>
                                <p className="text-sm whitespace-pre-wrap">{decidedRemarks || '—'}</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Reviewed By</p>
                                    <p className="text-sm">{approver?.name || (data.tlApprovedBy ? `User #${data.tlApprovedBy}` : '—')}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Reviewed At</p>
                                    <p className="text-sm">
                                        {data.tlApprovedAt ? formatDateTime(data.tlApprovedAt) : '—'}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
                <DialogContent>
                    {dialog && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{ACTION_META[dialog.status].title}</DialogTitle>
                                <DialogDescription>{ACTION_META[dialog.status].description}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Remarks (optional)</p>
                                <Textarea
                                    value={dialog.remarks}
                                    onChange={(event) =>
                                        setDialog({ ...dialog, remarks: event.target.value })
                                    }
                                    placeholder="Add any remarks for this decision"
                                    rows={4}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDialog(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant={dialog.status === 'REJECTED' ? 'destructive' : 'default'}
                                    onClick={handleConfirm}
                                    disabled={actOnApproval.isPending}
                                >
                                    {actOnApproval.isPending
                                        ? 'Saving...'
                                        : ACTION_META[dialog.status].confirmLabel}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BankGuaranteeApprovalPage;
