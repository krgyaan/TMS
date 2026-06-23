import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { ExternalLink, FileText } from 'lucide-react';
import type { TenderCostingSheet } from '../helpers/costingSheet.types';

interface CostingSheetViewProps {
    costingSheet?: TenderCostingSheet | null;
    vendors?: VendorOrganization[];
}

export function CostingSheetView({ costingSheet, vendors }: CostingSheetViewProps) {
    if (!costingSheet) return null;

    return (
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
                        {costingSheet.googleSheetUrl && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Google Sheet
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Sheet Title
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {costingSheet.sheetTitle || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Sheet URL
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {costingSheet.googleSheetUrl ? (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => window.open(costingSheet.googleSheetUrl!, '_blank')}
                                            >
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                Open Sheet
                                            </Button>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Submitted Values */}
                        {(costingSheet.submittedFinalPrice || costingSheet.submittedReceiptPrice || costingSheet.submittedBudgetPrice) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Submitted Values (by Tender Executive)
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Final Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.submittedFinalPrice ? formatINR(Number(costingSheet.submittedFinalPrice)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Receipt Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.submittedReceiptPrice ? formatINR(Number(costingSheet.submittedReceiptPrice)) : '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Budget Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.submittedBudgetPrice ? formatINR(Number(costingSheet.submittedBudgetPrice)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Gross Margin
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.submittedGrossMargin ? `${parseFloat(costingSheet.submittedGrossMargin)}%` : '—'}
                                    </TableCell>
                                </TableRow>
                                {costingSheet.teRemarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            TE Remarks
                                        </TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>
                                            {costingSheet.teRemarks}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Approved Values */}
                        {(costingSheet.status == 'Approved') && (
                            <>
                                <TableRow className='w-full bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800'>
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Approved Values (by Team Lead)
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Final Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.finalPrice ? formatINR(Number(costingSheet.finalPrice)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Receipt Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.receiptPrice ? formatINR(Number(costingSheet.receiptPrice)) : '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Budget Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.budgetPrice ? formatINR(Number(costingSheet.budgetPrice)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Gross Margin
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {costingSheet.grossMargin ? `${parseFloat(costingSheet.grossMargin)}%` : '—'}
                                    </TableCell>
                                </TableRow>
                                {costingSheet.oemVendorIds && costingSheet.oemVendorIds.length > 0 && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            OEM Vendor IDs
                                        </TableCell>
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
                                {costingSheet.tlRemarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            TL Remarks
                                        </TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>
                                            {costingSheet.tlRemarks}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Rejection Reason */}
                        {costingSheet.rejectionReason && (
                            <>
                                <TableRow className='w-full bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800'>
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Rejection Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Rejection Reason
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        <div className="bg-destructive/10 p-3 rounded-md break-words">
                                            {costingSheet.rejectionReason}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Timeline */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Timeline
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created At
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(costingSheet.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Last Updated
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(costingSheet.updatedAt)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

import { Badge } from '@/components/ui/badge';
import { useCostingDetailsByTender, useCostingDetailsCombined } from '@/hooks/api/useCostingSheets';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import type { VendorOrganization } from '@/types/api.types';
import type { TenderCostingDetail } from '../helpers/costingSheet.types';

const ITEM_WISE_TYPES = ['ITEM_WISE_PRE_GST', 'ITEM_WISE_GST_INCLUSIVE'];

/** Smart Section component for Costing Sheet and Approval Details */
export function CostingSheetSection({ tenderId }: { tenderId: number | null }) {
    const { data: costingSheet, isLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: infoSheet } = useInfoSheet(tenderId);
    const { data: details } = useCostingDetailsByTender(tenderId ?? 0);
    const { data: combined } = useCostingDetailsCombined(tenderId ?? 0);
    const { data: vendorOrganizations } = useVendorOrganizations();

    const isItemWise = infoSheet && ITEM_WISE_TYPES.includes(infoSheet.commercialEvaluation ?? '');

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

    return (
        <div className="space-y-6">
            {/* Show primary costing sheet view (first detail merged) */}
            {costingSheet && (
                <CostingSheetView costingSheet={costingSheet} vendors={selectedVendorOrganizations} />
            )}

            {/* Show all details for item-wise tenders */}
            {isItemWise && details && details.length > 0 && (
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
                                <Card key={detail.id} className="border-l-4 border-l-primary">
                                    <CardContent className="py-2">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                                            <div>Final Price <br /> <strong className='text-lg'>{formatINR(detail.submittedFinalPrice || 0)}</strong></div>
                                            <div>Receipt <br /> <strong className='text-lg'>{formatINR(detail.submittedReceiptPrice || 0)}</strong></div>
                                            <div>Budget <br /> <strong className='text-lg'>{formatINR(detail.submittedBudgetPrice || 0)}</strong></div>
                                            <div>Gross Margin <br /> <strong className='text-lg'>{detail.submittedGrossMargin || '0'}%</strong></div>
                                            <div>TE Remark <br /> <strong>{detail.teRemarks}</strong></div>
                                        </div>
                                        {detail.approvedBy && (
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 m-2 p-2 text-sm bg-green-50 dark:bg-green-950/20 rounded">
                                                <div>Approved Final Price <br /> <strong className='text-lg'>{formatINR(detail.finalPrice || 0)}</strong></div>
                                                <div>Approved Receipt <br /> <strong className='text-lg'>{formatINR(detail.receiptPrice || 0)}</strong></div>
                                                <div>Approved Budget <br /> <strong className='text-lg'>{formatINR(detail.budgetPrice || 0)}</strong></div>
                                                <div>Approved Gross Margin <br /> <strong className='text-lg'>{detail.grossMargin || '0'}%</strong></div>
                                                <div>TL Remark <br /> <strong>{detail.tlRemarks}</strong></div>
                                            </div>
                                        )}
                                        {detail.rejectionReason && (
                                            <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">{detail.rejectionReason}</div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {combined && combined.detailsCount > 0 && (
                            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                                <p className="text-sm font-semibold mb-1">Combined Totals (Approved Only)</p>
                                <div className="grid grid-cols-4 gap-2 text-sm">
                                    <div>Final Price <br/> <strong>{formatINR(combined.totalFinalPrice || 0)}</strong></div>
                                    <div>Receipt <br/> <strong>{formatINR(combined.totalReceiptPrice || 0)}</strong></div>
                                    <div>Budget <br/> <strong>{formatINR(combined.totalBudgetPrice || 0)}</strong></div>
                                    <div>Approved <br/> <strong>{combined.approvedCount}/{combined.detailsCount}</strong></div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {!costingSheet && !(details && details.length > 0) && (
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
