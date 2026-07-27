import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { User, FileText, ClipboardList } from "lucide-react";
import { useLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { LeadEnquiryWithNames } from "./helpers/lead-enquiry.type";

interface LeadEnquiryViewProps {
    enquiry?: LeadEnquiryWithNames | null;
    enquiryId?: number | null;
    isLoading?: boolean;
    className?: string;
}

export function LeadEnquiryView({ enquiry: manualEnquiry, enquiryId, isLoading: manualLoading = false, className = "" }: LeadEnquiryViewProps) {
    const { data: queryData, isLoading: queryLoading } = useLeadEnquiry(enquiryId ?? null);
    const enquiry = manualEnquiry || queryData;
    const isLoading = manualLoading || queryLoading;

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
                            <TableCell className="text-sm font-medium text-muted-foreground">Location Code</TableCell>
                            <TableCell className="text-sm">{enquiry.locationCode || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Approx Value</TableCell>
                            <TableCell className="text-sm">{enquiry.approxValue || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                            <TableCell className="text-sm">{enquiry.status || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Rejection Reason</TableCell>
                            <TableCell className="text-sm">{enquiry.rejectionReason || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Site Visit Required</TableCell>
                            <TableCell className="text-sm">{enquiry.siteVisitRequired ? "Yes" : "No"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Lead</TableCell>
                            <TableCell className="text-sm">{enquiry.leadName || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Team</TableCell>
                            <TableCell className="text-sm">{enquiry.team || "—"}</TableCell>
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

// ── View Page with ShowPageLayout ────────────────────────────────────────────

interface LeadEnquiryViewPageProps {
    enquiryId: number;
    onBack?: () => void;
    backLabel?: string;
}

const ENQUIRY_STEPS: StepConfig[] = [
    {
        id: "enquiry-details",
        label: "Enquiry Details",
        shortLabel: "Details",
        stepNumber: 1,
        status: "completed",
        hasData: true,
        isLoading: false,
    },
];

export function LeadEnquiryViewPage({ enquiryId, onBack, backLabel }: LeadEnquiryViewPageProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["enquiry-details"]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(ENQUIRY_STEPS.map((s) => s.id))), []);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback((stepId: string) => {
        switch (stepId) {
            case "enquiry-details":
                return <EnquiryDetailsSection enquiryId={enquiryId} />;
            default:
                return null;
        }
    }, [enquiryId]);

    return (
        <ShowPageLayout
            steps={ENQUIRY_STEPS}
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
