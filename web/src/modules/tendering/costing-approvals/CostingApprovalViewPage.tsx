import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCostingApprovalById } from '@/hooks/api/useCostingApprovals';
import { useTender } from '@/hooks/api/useTenders';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { paths } from '@/app/routes/paths';

export default function CostingApprovalViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: costingSheet, isLoading: costingLoading, error: costingError } = useCostingApprovalById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(costingSheet?.tenderId));
    const { data: vendorOrganizations } = useVendorOrganizations();

    if (costingLoading || tenderLoading) return <Skeleton className="h-[800px]" />;

    if (costingError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load costing sheet. You may not have permission to access this resource.
                </AlertDescription>
            </Alert>
        );
    }

    if (!costingSheet || !tenderDetails) return <div>Costing sheet not found</div>;

    const selectedVendorOrganizations = vendorOrganizations?.filter(vo =>
        costingSheet.oemVendorIds?.includes(vo.id)
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate(paths.tendering.costingApprovals)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <CardTitle>Costing Sheet Details</CardTitle>
                                <Badge variant={costingSheet.status === 'Submitted' ? 'default' : costingSheet.status === 'Approved' ? 'secondary' : 'destructive'}>
                                    {costingSheet.status}
                                </Badge>
                            </div>
                            <CardDescription className="mt-2">
                                View detailed information about this costing sheet
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            <CardContent className="space-y-8">
                {/* Tender Information */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-base text-primary border-b pb-2">
                        Tender Information
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Tender No</p>
                            <p className="text-base font-semibold">{tenderDetails.tenderNo}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Team Member</p>
                            <p className="text-base font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">Tender Name</p>
                            <p className="text-base font-semibold">{tenderDetails.tenderName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                            <p className="text-base font-semibold">
                                {tenderDetails.dueDate ? formatDateTime(tenderDetails.dueDate as Date) : '—'}
                            </p>
                        </div>
                        {costingSheet.googleSheetUrl && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Google Sheet</p>
                                <a
                                    href={costingSheet.googleSheetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-base font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    View Sheet <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-base text-primary border-b pb-2">
                        Costing Details
                    </h4>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* TE Submitted Values */}
                        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                <h5 className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                                    TE Submitted Values
                                </h5>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                    {costingSheet.submittedFinalPrice
                                        ? formatINR(parseFloat(costingSheet.submittedFinalPrice))
                                        : '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Receipt (Pre GST)</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                    {costingSheet.submittedReceiptPrice
                                        ? formatINR(parseFloat(costingSheet.submittedReceiptPrice))
                                        : '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Budget (Pre GST)</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                    {costingSheet.submittedBudgetPrice
                                        ? formatINR(parseFloat(costingSheet.submittedBudgetPrice))
                                        : '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                    {costingSheet.submittedGrossMargin
                                        ? `${costingSheet.submittedGrossMargin}%`
                                        : '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">TE Remarks</p>
                                <p className="text-sm text-muted-foreground break-words">
                                    {costingSheet.teRemarks || '—'}
                                </p>
                            </div>

                            {costingSheet.submittedAt && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Submitted At</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDateTime(costingSheet.submittedAt)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* TL Approved Values */}
                        <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                <h5 className="font-semibold text-sm text-green-700 dark:text-green-300">
                                    TL Approved Values
                                </h5>
                            </div>

                            {costingSheet.status === 'Approved' ? (
                                <>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                            {costingSheet.finalPrice
                                                ? formatINR(parseFloat(costingSheet.finalPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Receipt (Pre GST)</p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                            {costingSheet.receiptPrice
                                                ? formatINR(parseFloat(costingSheet.receiptPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Budget (Pre GST)</p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                            {costingSheet.budgetPrice
                                                ? formatINR(parseFloat(costingSheet.budgetPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                            {costingSheet.grossMargin
                                                ? `${costingSheet.grossMargin}%`
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Selected Vendors</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedVendorOrganizations.length > 0 ? (
                                                selectedVendorOrganizations.map(vendorOrg => (
                                                    <Badge key={vendorOrg.id} variant="outline">
                                                        {vendorOrg.name}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">—</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">TL Remarks</p>
                                        <p className="text-sm text-muted-foreground break-words">
                                            {costingSheet.tlRemarks || '—'}
                                        </p>
                                    </div>

                                    {costingSheet.approvedAt && (
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Approved At</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDateTime(costingSheet.approvedAt)}
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground">
                                        {costingSheet.status === 'Submitted'
                                            ? 'Awaiting approval'
                                            : 'Not approved yet'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rejection Reason (if rejected) */}
                {costingSheet.status === 'Rejected/Redo' && costingSheet.rejectionReason && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-base text-destructive border-b pb-2">
                            Rejection Reason
                        </h4>
                        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                            <p className="text-sm text-destructive break-words">{costingSheet.rejectionReason}</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button variant="outline" onClick={() => navigate(paths.tendering.costingApprovals)}>
                        Back to List
                    </Button>
                    {costingSheet.status === 'Submitted' && (
                        <>
                            <Button variant="outline" onClick={() => navigate(paths.tendering.costingReject(Number(id)))}>
                                Reject
                            </Button>
                            <Button onClick={() => navigate(paths.tendering.costingApprove(Number(id)))}>
                                Approve
                            </Button>
                        </>
                    )}
                    {costingSheet.status === 'Approved' && (
                        <Button onClick={() => navigate(paths.tendering.costingEditApproval(Number(id)))}>
                            Edit Approval
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
        </div>
    );
}
