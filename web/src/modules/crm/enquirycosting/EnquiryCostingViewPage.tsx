import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, User, FileText, BadgeCheck } from "lucide-react";
import { useEnquiryCosting } from "@/hooks/api/useEnquiryCosting";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { useLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EnquiryCosting } from "./helpers/enquirycosting.type";
import { LeadDetailsSection } from "../leads/components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { LeadEnquiriesSection } from "../lead-enquiry/LeadEnquiryViewPage";
import { LeadSiteVisitsSection } from "../lead-enquiry/components/LeadSiteVisitView";
import { enquiryCostingService } from "@/services/api/enquirycosting.service";
import { LeadQuotationsSection } from "../leads-quotation/LeadsQuotationViewPage";
import { paths } from "@/app/routes/paths";

interface EnquiryCostingViewProps {
    costing?: EnquiryCosting | null;
    costingId?: number | null;
    isLoading?: boolean;
    className?: string;
}

export function EnquiryCostingView({ costing: manualCosting, costingId, isLoading: manualLoading = false, className = "" }: EnquiryCostingViewProps) {
    const { data: queryData, isLoading: queryLoading } = useEnquiryCosting(costingId ?? null);
    const costing = manualCosting || queryData;
    const isLoading = manualLoading || queryLoading;

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader><CardTitle>Costing Sheet Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!costing) return null;

    const isApproved = costing.status === 'Approved';

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" /> Costing Sheet Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <FileText className="h-4 w-4 inline mr-2" /> Basic Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Enquiry Number</TableCell>
                            <TableCell className="text-sm w-1/4">{costing.enquiryNumber || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Enquiry Name</TableCell>
                            <TableCell className="text-sm w-1/4">{costing.enqName || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Organization</TableCell>
                            <TableCell className="text-sm">{costing.organizationName || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Org Abb Name</TableCell>
                            <TableCell className="text-sm">{costing.orgAbbName || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Approx Value</TableCell>
                            <TableCell className="text-sm">{costing.approxValue ? `₹${costing.approxValue}` : "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Final Price (GST Inclusive)</TableCell>
                            <TableCell className="text-sm">{costing.finalPrice ? `₹${costing.finalPrice}` : "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Receipt (Pre GST)</TableCell>
                            <TableCell className="text-sm">{costing.receiptPreGst ? `₹${costing.receiptPreGst}` : "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Budget (Pre GST)</TableCell>
                            <TableCell className="text-sm">{costing.budgetPreGst ? `₹${costing.budgetPreGst}` : "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Gross Margin</TableCell>
                            <TableCell className="text-sm">{costing.grossMargin ? `${costing.grossMargin}%` : "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Prepared By</TableCell>
                            <TableCell className="text-sm">{costing.preparedByName || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                            <TableCell className="text-sm">
                                <Badge variant={isApproved ? "default" : "secondary"} className={cn(isApproved && "bg-green-600 hover:bg-green-600")}>
                                    {costing.status || "—"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Remarks</TableCell>
                            <TableCell className="text-sm">{costing.remarks || "—"}</TableCell>
                        </TableRow>

                        {isApproved && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        <BadgeCheck className="h-4 w-4 inline mr-2" /> Approved Values
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Approved Final Price</TableCell>
                                    <TableCell className="text-sm">{costing.approvedFinalPrice ? `₹${costing.approvedFinalPrice}` : "—"}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Approved Receipt (Pre GST)</TableCell>
                                    <TableCell className="text-sm">{costing.approvedReceiptPreGst ? `₹${costing.approvedReceiptPreGst}` : "—"}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Approved Budget (Pre GST)</TableCell>
                                    <TableCell className="text-sm">{costing.approvedBudgetPreGst ? `₹${costing.approvedBudgetPreGst}` : "—"}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Approved Gross Margin</TableCell>
                                    <TableCell className="text-sm">{costing.approvedGrossMargin ? `${costing.approvedGrossMargin}%` : "—"}</TableCell>
                                </TableRow>
                            </>
                        )}

                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <User className="h-4 w-4 inline mr-2" /> Audit Information
                            </TableCell>
                        </TableRow>
                        {costing.approvedByName && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">Approved By</TableCell>
                                <TableCell className="text-sm">{costing.approvedByName}</TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground" />
                                <TableCell className="text-sm" />
                            </TableRow>
                        )}
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Created By</TableCell>
                            <TableCell className="text-sm">{costing.createdByName || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Created At</TableCell>
                            <TableCell className="text-sm">{costing.createdAt ? new Date(costing.createdAt).toLocaleString("en-IN") : "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Updated At</TableCell>
                            <TableCell className="text-sm" colSpan={3}>{costing.updatedAt ? new Date(costing.updatedAt).toLocaleString("en-IN") : "—"}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function EnquiryCostingDetailsSection({ costingId }: { costingId: number | null }) {
    const { data: costing, isLoading } = useEnquiryCosting(costingId);

    if (isLoading && !costing) return <EnquiryCostingView costing={null} isLoading />;

    return (
        <div className="space-y-6">
            {costing ? (
                <EnquiryCostingView costing={costing} isLoading={isLoading} />
            ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Costing sheet not available.</p>
            )}
        </div>
    );
}

export function LeadCostingsSection({ leadId }: { leadId: number }) {
    const { data: costings, isLoading } = useQuery({
        queryKey: ['enquiry-costings', 'by-lead', leadId],
        queryFn: () => enquiryCostingService.getByLeadId(leadId),
    });

    if (isLoading) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading costings...</div>;
    }

    if (!costings?.length) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No costings found for this lead.</p>;
    }

    return (
        <div className="space-y-4">
            {costings.map((c) => (
                <EnquiryCostingView key={c.id} costing={c} />
            ))}
        </div>
    );
}

// ── View Page with ShowPageLayout (5-step lead stepper) ──────────────────────

interface EnquiryCostingViewPageProps {
    costingId: number;
    onBack?: () => void;
    backLabel?: string;
}

export function EnquiryCostingViewPage({ costingId, onBack, backLabel }: EnquiryCostingViewPageProps) {
    const { data: costing } = useEnquiryCosting(costingId ?? null);
    const enquiryId = costing?.enquiryId ?? null;
    const { data: enquiry } = useLeadEnquiry(enquiryId);
    const leadId = enquiry?.leadId ?? null;
    const stepStatuses = useLeadStepStatuses(leadId);

    const steps = useMemo<StepConfig[]>(() => stepStatuses.map(s => ({
        id: s.id,
        label: s.label,
        shortLabel: s.shortLabel,
        stepNumber: s.stepNumber,
        status: s.status,
        hasData: s.hasData,
        isLoading: s.isLoading,
    })), [stepStatuses]);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["costings"]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(steps.map((s) => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback((stepId: string) => {
        if (!leadId) {
            return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading...</div>;
        }
        switch (stepId) {
            case "lead-details":
                return <LeadDetailsSection leadId={leadId} />;
            case "followups":
                return <FollowupViewPage leadId={leadId} />;
            case "enquiries":
                return <LeadEnquiriesSection leadId={leadId} />;
            case "site-visits":
                return <LeadSiteVisitsSection leadId={leadId} />;
            case "costings":
                return <EnquiryCostingDetailsSection costingId={costingId} />;
            case "quotations":
                return <LeadQuotationsSection leadId={leadId} />;
            default:
                return null;
        }
    }, [leadId, costingId]);

    return (
        <ShowPageLayout
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={onBack}
            backLabel={backLabel}
            renderSectionContent={renderSectionContent}
        />
    );
}

// ── Default export (route page) ──────────────────────────────────────────────

const EnquiryCostingViewPageRoute = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const costingId = id ? Number(id) : null;

    if (!costingId || isNaN(costingId)) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Invalid costing ID</p>
            </div>
        );
    }

    return (
        <EnquiryCostingViewPage
            costingId={costingId}
            onBack={() => navigate(paths.crm.enquiryCostings)}
            backLabel="Back to Costings"
        />
    );
};

export default EnquiryCostingViewPageRoute;
