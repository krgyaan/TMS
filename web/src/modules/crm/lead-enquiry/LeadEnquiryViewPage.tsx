import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { Building2, User, MapPin, DollarSign, FileText, ClipboardList } from "lucide-react";
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

function EnquiryDetailRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <TableRow>
            <TableCell className="font-medium text-muted-foreground w-48">{label}</TableCell>
            <TableCell>{value || "—"}</TableCell>
        </TableRow>
    );
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
                            <TableCell colSpan={2} className="font-semibold text-sm">
                                <FileText className="h-4 w-4 inline mr-2" /> Basic Information
                            </TableCell>
                        </TableRow>
                        <EnquiryDetailRow label="Enquiry Number" value={enquiry.enquiryNumber} />
                        <EnquiryDetailRow label="Enquiry Name" value={enquiry.enqName} />
                        <EnquiryDetailRow label="Organization" value={enquiry.organizationName} />
                        <EnquiryDetailRow label="Org Abb Name" value={enquiry.orgAbbName} />
                        <EnquiryDetailRow label="Item" value={enquiry.itemName} />
                        <EnquiryDetailRow label="Location Code" value={enquiry.locationCode} />
                        <EnquiryDetailRow label="Approx Value" value={enquiry.approxValue} />
                        <EnquiryDetailRow label="Status" value={enquiry.status} />
                        <EnquiryDetailRow label="Rejection Reason" value={enquiry.rejectionReason} />
                        <EnquiryDetailRow label="Site Visit Required" value={enquiry.siteVisitRequired ? "Yes" : "No"} />
                        <EnquiryDetailRow label="Lead" value={enquiry.leadName} />
                        <EnquiryDetailRow label="Team" value={enquiry.team} />

                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={2} className="font-semibold text-sm">
                                <User className="h-4 w-4 inline mr-2" /> Audit Information
                            </TableCell>
                        </TableRow>
                        <EnquiryDetailRow label="Created By" value={enquiry.createdByName} />
                        <EnquiryDetailRow label="Updated By" value={enquiry.updatedByName} />
                        <EnquiryDetailRow label="Created At" value={enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleString("en-IN") : "—"} />
                        <EnquiryDetailRow label="Updated At" value={enquiry.updatedAt ? new Date(enquiry.updatedAt).toLocaleString("en-IN") : "—"} />

                        {enquiry.notes && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={2} className="font-semibold text-sm">
                                        Notes
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={2}>{enquiry.notes}</TableCell>
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
