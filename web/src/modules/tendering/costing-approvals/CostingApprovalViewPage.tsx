import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import { formatINR } from '@/hooks/useINRFormatter';
import { paths } from '@/app/routes/paths';
import { TenderDetailsSection } from '@/modules/tendering/tenders/components/TenderView';
import { PhysicalDocsSection } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqSection } from '@/modules/tendering/rfqs/components/RfqView';
import { EmdTenderFeeSection } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistSection } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { BidSubmissionSection } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";

function CostingApprovalSection({ tenderId }: { tenderId: number }) {
    const navigate = useNavigate();
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId);
    const { data: vendorOrganizations } = useVendorOrganizations();

    const selectedVendorOrganizations = vendorOrganizations?.filter(vo =>
        costingSheet?.oemVendorIds?.includes(vo.id) || false
    ) || [];

    if (costingSheetLoading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
    if (!costingSheet) return <Alert><AlertDescription>No costing sheet found.</AlertDescription></Alert>;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <CardTitle>Costing Sheet Details</CardTitle>
                            <Badge variant={costingSheet?.status === 'Submitted' ? 'default' : costingSheet?.status === 'Approved' ? 'secondary' : 'destructive'}>
                                {costingSheet?.status}
                            </Badge>
                        </div>
                        <CardDescription className="mt-2">
                            View detailed information about this costing sheet
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                    <h4 className="font-semibold text-base text-primary border-b pb-2">Summary</h4>
                    <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                        {costingSheet?.googleSheetUrl && (
                            <div className="md:col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Google Sheet</p>
                                <a
                                    href={costingSheet?.googleSheetUrl}
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

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h5 className="font-semibold text-sm text-blue-700 dark:text-blue-300">TE Submitted Values</h5>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                {costingSheet?.submittedFinalPrice ? formatINR(parseFloat(costingSheet.submittedFinalPrice)) : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                {costingSheet?.submittedGrossMargin ? `${costingSheet.submittedGrossMargin}%` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">TE Remarks</p>
                            <p className="text-sm text-muted-foreground break-words">{costingSheet?.teRemarks || '—'}</p>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h5 className="font-semibold text-sm text-green-700 dark:text-green-300">TL Approved Values</h5>
                        {costingSheet?.status === 'Approved' ? (
                            <>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                        {costingSheet?.finalPrice ? formatINR(parseFloat(costingSheet.finalPrice)) : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                        {costingSheet?.grossMargin ? `${costingSheet.grossMargin}%` : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Selected Vendors</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedVendorOrganizations.length > 0 ? (
                                            selectedVendorOrganizations.map(vendorOrg => (
                                                <Badge key={vendorOrg.id} variant="outline">{vendorOrg.name}</Badge>
                                            ))
                                        ) : <p className="text-sm text-muted-foreground">—</p>}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-muted-foreground">
                                    {costingSheet?.status === 'Submitted' ? 'Awaiting approval' : 'Not approved yet'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button variant="outline" onClick={() => navigate(paths.tendering.costingApprovals)}>Back to List</Button>
                    {costingSheet?.status === 'Submitted' && (
                        <>
                            <Button variant="outline" onClick={() => navigate(paths.tendering.costingReject(costingSheet?.id))}>Reject</Button>
                            <Button onClick={() => navigate(paths.tendering.costingApprove(costingSheet?.id ?? 0))}>Approve</Button>
                        </>
                    )}
                    {costingSheet?.status === 'Approved' && (
                        <Button onClick={() => navigate(paths.tendering.costingEditApproval(costingSheet?.id ?? 0))}>Edit Approval</Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function CostingApprovalViewPage() {
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderId = tenderIdParam ? parseInt(tenderIdParam, 10) : null;

    const { steps: tenderSteps } = useTenderStepStatuses(tenderId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["costing-details"]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(tenderSteps.map((s) => s.id))), [tenderSteps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = (stepId: string) => {
        if (!tenderId) return null;
        switch (stepId) {
            case "tender-details":   return <TenderDetailsSection tenderId={tenderId} />;
            case "physical-docs":    return <PhysicalDocsSection tenderId={tenderId} />;
            case "rfq":              return <RfqSection tenderId={tenderId} />;
            case "emd-fees":         return <EmdTenderFeeSection tenderId={tenderId} />;
            case "checklist":        return <DocumentChecklistSection tenderId={tenderId} />;
            case "bid":              return <BidSubmissionSection tenderId={tenderId} />;
            case "costing":          return <CostingApprovalSection tenderId={tenderId} />;
            default: return null;
        }
    };

    if (!tenderId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID</AlertDescription>
            </Alert>
        );
    }

    return (
        <ShowPageLayout
            steps={tenderSteps.filter(s => ["tender-details", "physical-docs", "rfq", "emd-fees", "checklist", "bid", "costing"].includes(s.id))}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.tendering.costingApprovals)}
            backLabel="Back to Costing Approvals"
            renderSectionContent={renderSectionContent}
        />
    );
}
