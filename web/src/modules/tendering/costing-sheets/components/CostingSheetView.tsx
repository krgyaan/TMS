import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { ExternalLink, FileText } from 'lucide-react';
import type { TenderCostingSheet, TenderCostingDetail } from '../helpers/costingSheet.types';
import type { VendorOrganization } from '@/types/api.types';

interface CostingSheetViewProps {
    costingSheet?: TenderCostingSheet | null;
    details?: TenderCostingDetail[];
    vendors?: VendorOrganization[];
}

function getStatusBadgeClass(status: string) {
    const variants: Record<string, string> = {
        Approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700',
        Submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700',
        Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
        'Rejected/Redo': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700',
    };
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-300 dark:border-gray-700';
}

export function CostingSheetView({ costingSheet, details, vendors }: CostingSheetViewProps) {
    if (!costingSheet && !details?.length) return null;

    const allStatuses = [...new Set(details?.map(d => d.status) || [])];
    const hasApproved = details?.some(d => d.status === 'Approved') || false;
    const rejectionDetail = details?.find(d => d.rejectionReason);

    const totalSubmittedFinal = details?.reduce((s, d) => s + Number(d.submittedFinalPrice || 0), 0) || 0;
    const totalApprovedFinal = details?.filter(d => d.status === 'Approved')
        .reduce((s, d) => s + Number(d.finalPrice || 0), 0) || 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Costing Sheet Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            {/* Google Sheet */}
                            {costingSheet?.googleSheetUrl && (
                                <>
                                    <TableRow className="bg-muted/50">
                                        <TableCell colSpan={4} className="font-semibold text-sm">Google Sheet</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Sheet Title</TableCell>
                                        <TableCell className="text-sm">{costingSheet.sheetTitle || '—'}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Sheet URL</TableCell>
                                        <TableCell className="text-sm">
                                            {costingSheet.googleSheetUrl ? (
                                                <Button variant="link" size="sm" onClick={() => window.open(costingSheet.googleSheetUrl!, '_blank')}>
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    Open Sheet
                                                </Button>
                                            ) : '—'}
                                        </TableCell>
                                    </TableRow>
                                </>
                            )}

                            {/* Status */}
                            {details && details.length > 0 && (
                                <>
                                    <TableRow className="bg-muted/50">
                                        <TableCell colSpan={4} className="font-semibold text-sm">Status</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Overall Status</TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            <div className="flex flex-wrap gap-2">
                                                {allStatuses.map(status => (
                                                    <Badge key={status} variant="outline" className={getStatusBadgeClass(status)}>{status}</Badge>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {details.filter(d => d.status === 'Approved').length} approved,{' '}
                                                {details.filter(d => d.status === 'Submitted').length} submitted,{' '}
                                                {details.filter(d => d.status === 'Pending').length} pending,{' '}
                                                {details.filter(d => d.status === 'Rejected/Redo').length} rejected
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                </>
                            )}

                            {/* Pricing Summary */}
                            {details && details.length > 0 && (
                                <>
                                    <TableRow className="bg-muted/50">
                                        <TableCell colSpan={4} className="font-semibold text-sm">Pricing Summary</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Total Submitted Final Price</TableCell>
                                        <TableCell className="text-sm font-semibold">{formatINR(totalSubmittedFinal)}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Total Approved Final Price</TableCell>
                                        <TableCell className="text-sm font-semibold">{hasApproved ? formatINR(totalApprovedFinal) : '—'}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Total Details</TableCell>
                                        <TableCell className="text-sm">{details.length}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Approved Details</TableCell>
                                        <TableCell className="text-sm">{details.filter(d => d.status === 'Approved').length}</TableCell>
                                    </TableRow>
                                </>
                            )}

                            {/* OEM Vendor IDs */}
                            {costingSheet?.oemVendorIds && costingSheet.oemVendorIds.length > 0 && (
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">OEM Vendor IDs</TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {vendors && vendors.length > 0 ? (
                                                vendors.map(vendorOrg => (
                                                    <Badge key={vendorOrg.id} variant="outline" className="border-green-200 dark:border-green-800">{vendorOrg.name}</Badge>
                                                ))
                                            ) : <p className="text-sm text-muted-foreground">—</p>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* Rejection Details */}
                            {rejectionDetail?.rejectionReason && (
                                <>
                                    <TableRow className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                        <TableCell colSpan={4} className="font-semibold text-sm">Rejection Details</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Rejection Reason</TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            <div className="bg-destructive/10 p-3 rounded-md break-words">
                                                {rejectionDetail.rejectionReason}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </>
                            )}

                            {/* Timeline */}
                            {costingSheet && (
                                <>
                                    <TableRow className="bg-muted/50">
                                        <TableCell colSpan={4} className="font-semibold text-sm">Timeline</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Created At</TableCell>
                                        <TableCell className="text-sm">{formatDateTime(costingSheet.createdAt)}</TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Last Updated</TableCell>
                                        <TableCell className="text-sm">{formatDateTime(costingSheet.updatedAt)}</TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Individual Detail Cards */}
            {details && details.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Costing Details ({details.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {details.map((detail: TenderCostingDetail) => (
                                <Card key={detail.id} className={`border-l-4 ${detail.status === 'Approved' ? 'border-l-green-500' : detail.status === 'Rejected/Redo' ? 'border-l-red-500' : 'border-l-primary'}`}>
                                    <CardContent className="py-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                                                Detail #{detail.id}
                                            </span>
                                            <Badge variant="outline" className={getStatusBadgeClass(detail.status)}>{detail.status}</Badge>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                                            <div>Submitted Final Price <br /><strong className="text-lg">{formatINR(detail.submittedFinalPrice || 0)}</strong></div>
                                            <div>Submitted Receipt <br /><strong className="text-lg">{formatINR(detail.submittedReceiptPrice || 0)}</strong></div>
                                            <div>Submitted Budget <br /><strong className="text-lg">{formatINR(detail.submittedBudgetPrice || 0)}</strong></div>
                                            <div>Gross Margin <br /><strong className="text-lg">{detail.submittedGrossMargin || '0'}%</strong></div>
                                            <div>TE Remark <br /><strong>{detail.teRemarks || '—'}</strong></div>
                                        </div>
                                        {detail.approvedBy && (
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 m-2 p-2 text-sm bg-green-50 dark:bg-green-950/20 rounded">
                                                <div>Approved Final Price <br /><strong className="text-lg">{formatINR(detail.finalPrice || 0)}</strong></div>
                                                <div>Approved Receipt <br /><strong className="text-lg">{formatINR(detail.receiptPrice || 0)}</strong></div>
                                                <div>Approved Budget <br /><strong className="text-lg">{formatINR(detail.budgetPrice || 0)}</strong></div>
                                                <div>Approved Gross Margin <br /><strong className="text-lg">{detail.grossMargin || '0'}%</strong></div>
                                                <div>TL Remark <br /><strong>{detail.tlRemarks || '—'}</strong></div>
                                            </div>
                                        )}
                                        {detail.rejectionReason && (
                                            <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">{detail.rejectionReason}</div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

import { useCostingSheetByTender, useCostingDetailsByTender, useCostingDetailsCombined } from '@/hooks/api/useCostingSheets';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';

/** Smart Section component for Costing Sheet and Approval Details */
export function CostingSheetSection({ tenderId }: { tenderId: number | null }) {
    const { data: costingSheet, isLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: details } = useCostingDetailsByTender(tenderId ?? 0);
    const { data: combined } = useCostingDetailsCombined(tenderId ?? 0);
    const { data: vendorOrganizations } = useVendorOrganizations();

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const selectedVendorOrganizations = vendorOrganizations?.filter(vo =>
        costingSheet?.oemVendorIds?.includes(vo.id) || false
    ) || [];

    const hasAnyData = costingSheet || (details && details.length > 0);

    return (
        <div className="space-y-6">
            <CostingSheetView
                costingSheet={costingSheet}
                details={details}
                vendors={selectedVendorOrganizations}
            />

            {combined && combined.detailsCount > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Combined Totals (Approved Only)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                            <div>Final Price <br /> <strong>{formatINR(combined.totalFinalPrice || 0)}</strong></div>
                            <div>Receipt <br /> <strong>{formatINR(combined.totalReceiptPrice || 0)}</strong></div>
                            <div>Budget <br /> <strong>{formatINR(combined.totalBudgetPrice || 0)}</strong></div>
                            <div>Approved <br /> <strong>{combined.approvedCount}/{combined.detailsCount}</strong></div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!hasAnyData && (
                <Card>
                    <CardContent className="pt-0">
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                            <FileText className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Costing sheet not created for this tender yet.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
