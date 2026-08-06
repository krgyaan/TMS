import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, ClipboardList, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { leadEnquiryService } from "@/services/api/lead-enquiry.service";
import type { SiteVisit } from "../helpers/lead-enquiry.type";

interface SiteVisitWithEnquiry extends SiteVisit {
    enqName?: string | null;
    enquiryNumber?: string | null;
}

interface LeadSiteVisitViewProps {
    siteVisit: SiteVisitWithEnquiry | null;
    isLoading?: boolean;
    className?: string;
}

export function LeadSiteVisitView({ siteVisit, isLoading = false, className = "" }: LeadSiteVisitViewProps) {
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader><CardTitle>Site Visit Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!siteVisit) return null;

    const isCompleted = siteVisit.status === 'completed';
    const documents = siteVisit.documents ? siteVisit.documents.split(",").map(d => d.trim()).filter(Boolean) : [];

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> Site Visit Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <ClipboardList className="h-4 w-4 inline mr-2" /> Site Allocation
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Enquiry Number</TableCell>
                            <TableCell className="text-sm w-1/4">{siteVisit.enquiryNumber || "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">Enquiry Name</TableCell>
                            <TableCell className="text-sm w-1/4">{siteVisit.enqName || "—"}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Scheduled At</TableCell>
                            <TableCell className="text-sm">{siteVisit.scheduledAt ? new Date(siteVisit.scheduledAt).toLocaleString("en-IN") : "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Assigned To</TableCell>
                            <TableCell className="text-sm">{siteVisit.assignedToName || (siteVisit.assignedTo ? `User #${siteVisit.assignedTo}` : "—")}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                            <TableCell className="text-sm">
                                <Badge variant={isCompleted ? "default" : "secondary"} className={cn(isCompleted && "bg-green-600 hover:bg-green-600")}>
                                    {siteVisit.status || "—"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground" />
                            <TableCell className="text-sm" />
                        </TableRow>

                        {siteVisit.conductedAt && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        <FileText className="h-4 w-4 inline mr-2" /> Site Visit Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Conducted At</TableCell>
                                    <TableCell className="text-sm">{siteVisit.conductedAt ? new Date(siteVisit.conductedAt).toLocaleString("en-IN") : "—"}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Information</TableCell>
                                    <TableCell className="text-sm">{siteVisit.information || siteVisit.additionalNotes || "—"}</TableCell>
                                </TableRow>
                                {documents.length > 0 && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">Documents</TableCell>
                                        <TableCell colSpan={3} className="text-sm">
                                            <div className="flex flex-wrap gap-2">
                                                {documents.map((doc, i) => (
                                                    <a
                                                        key={i}
                                                        href={`/uploads/site-visit/${doc}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                        {doc}
                                                    </a>
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                <User className="h-4 w-4 inline mr-2" /> Audit Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">Created At</TableCell>
                            <TableCell className="text-sm">{siteVisit.createdAt ? new Date(siteVisit.createdAt).toLocaleString("en-IN") : "—"}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Updated At</TableCell>
                            <TableCell className="text-sm">{siteVisit.updatedAt ? new Date(siteVisit.updatedAt).toLocaleString("en-IN") : "—"}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function LeadSiteVisitsSection({ leadId }: { leadId: number }) {
    const { data: siteVisits, isLoading } = useQuery({
        queryKey: ['site-visits', 'by-lead', leadId],
        queryFn: () => leadEnquiryService.getSiteVisitsByLead(leadId),
    });

    if (isLoading) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading site visits...</div>;
    }

    if (!siteVisits?.length) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No site visits found for this lead.</p>;
    }

    return (
        <div className="space-y-4">
            {siteVisits.map((sv) => (
                <LeadSiteVisitView key={sv.id} siteVisit={sv as any} />
            ))}
        </div>
    );
}
