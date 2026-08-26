import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { User, FileText, ClipboardList, AlertCircle } from "lucide-react";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useLeadEnquiry, useLeadEnquiries } from "@/hooks/api/useLeadEnquiry";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { useLocations } from "@/hooks/api/useLocations";
import { LeadDetailsSection } from "../leads/components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { LeadSiteVisitsSection } from "./components/LeadSiteVisitView";
import { EnquiryResultSection } from "../enquiry-result/EnquiryResultViewPage";
import { EnquiryTenderFlow } from "@/modules/tendering/tenders/components/EnquiryTenderFlow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LeadEnquiryWithNames } from "./helpers/lead-enquiry.type";
import { paths } from "@/app/routes/paths";

interface LeadEnquiryViewProps {
    enquiry?: LeadEnquiryWithNames | null;
    enquiryId?: number | null;
    isLoading?: boolean;
    className?: string;
}

export function LeadEnquiryView({ enquiry: manualEnquiry, enquiryId, isLoading: manualLoading = false, className = "" }: LeadEnquiryViewProps) {
    const { data: queryData, isLoading: queryLoading } = useLeadEnquiry(enquiryId ?? null);
    const { data: locations = [] } = useLocations();
    const enquiry = manualEnquiry || queryData;
    const isLoading = manualLoading || queryLoading;
    const locationName = enquiry?.locationCode
        ? locations.find((l) => String(l.id) === enquiry.locationCode)?.name ?? enquiry.locationCode
        : "—";

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader><CardTitle>Enquiry Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!enquiry) return null;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" /> Enquiry Details
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
                            <TableCell className="text-sm w-1/4">{enquiry.enquiryNumber || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Enquiry Name</TableCell>
                            <TableCell className="text-sm w-1/4">{enquiry.enqName || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Organization</TableCell>
                            <TableCell className="text-sm">{enquiry.organizationName || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Org Abb Name</TableCell>
                            <TableCell className="text-sm">{enquiry.orgAbbName || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Item</TableCell>
                            <TableCell className="text-sm">{enquiry.itemName || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Location</TableCell>
                            <TableCell className="text-sm">{locationName}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Approx Value</TableCell>
                            <TableCell className="text-sm">{enquiry.approxValue || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                            <TableCell className="text-sm">{enquiry.status || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Enquiry Type</TableCell>
                            <TableCell className="text-sm">{enquiry.enquiryType || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Rejection Reason</TableCell>
                            <TableCell className="text-sm">{enquiry.rejectionReason || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Site Visit Required</TableCell>
                            <TableCell className="text-sm">{enquiry.siteVisitRequired ? "Yes" : "No"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Lead</TableCell>
                            <TableCell className="text-sm">{enquiry.leadName || "—"}</TableCell>
                        </TableRow>

                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <User className="h-4 w-4 inline mr-2" /> Audit Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Created By</TableCell>
                            <TableCell className="text-sm">{enquiry.createdByName || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Updated By</TableCell>
                            <TableCell className="text-sm">{enquiry.updatedByName || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Created At</TableCell>
                            <TableCell className="text-sm">{enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleString("en-IN") : "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Updated At</TableCell>
                            <TableCell className="text-sm">{enquiry.updatedAt ? new Date(enquiry.updatedAt).toLocaleString("en-IN") : "—"}</TableCell>
                        </TableRow>

                        {enquiry.notes && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">Notes</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-sm">{enquiry.notes}</TableCell>
                                </TableRow>
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function EnquiryDetailsSection({ enquiryId }: { enquiryId: number | null }) {
    const { data: enquiry, isLoading } = useLeadEnquiry(enquiryId);

    if (isLoading && !enquiry) return <LeadEnquiryView enquiry={null} isLoading />;

    return (
        <div className="space-y-6">
            {enquiry ? (
                <LeadEnquiryView enquiry={enquiry} isLoading={isLoading} />
            ) : (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Enquiry information not available.</AlertDescription>
                </Alert>
            )}
        </div>
    );
}

export function LeadEnquiriesSection({ leadId }: { leadId: number }) {
    const { data: apiResponse, isLoading } = useLeadEnquiries(
        { page: 1, limit: 50, leadId },
    );

    if (isLoading) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading enquiries...</div>;
    }

    if (!apiResponse?.data?.length) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No enquiries found for this lead.</p>;
    }

    return (
        <div className="space-y-4">
            {apiResponse.data.map((enquiry) => (
                <LeadEnquiryView key={enquiry.id} enquiry={enquiry} />
            ))}
        </div>
    );
}

export default function LeadEnquiryShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const enquiryId = id ? Number(id) : null;

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

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["enquiries"]));

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
        if (stepId === "enquiries") {
            return <EnquiryDetailsSection enquiryId={enquiryId} />;
        }
        if (!leadId) {
            return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading...</div>;
        }
        switch (stepId) {
            case "lead-details":
                return <LeadDetailsSection leadId={leadId} />;
            case "followups":
                return <FollowupViewPage source={{ sourceType: 'lead', sourceId: leadId }} />;
            case "site-visits":
                return <LeadSiteVisitsSection leadId={leadId} />;
            case "enquiry-result":
                return <EnquiryResultSection leadId={leadId} />;
            default:
                return null;
        }
    }, [leadId, enquiryId]);

    if (!enquiryId || isNaN(enquiryId)) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Invalid enquiry ID</p>
            </div>
        );
    }

    if (enquiry?.tenderId) {
        return (
            <EnquiryTenderFlow
                tenderId={enquiry.tenderId}
                enquiryId={enquiryId}
                defaultExpanded="enquiry"
                onBack={() => navigate(paths.crm.enquiries)}
                backLabel="Back to Enquiries"
            />
        );
    }

    return (
        <ShowPageLayout
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.crm.enquiries)}
            backLabel="Back to Enquiries"
            renderSectionContent={renderSectionContent}
        />
    );
}
