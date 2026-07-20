import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { User, Phone, Mail, MapPin, Building2, Users, Star, Calendar } from "lucide-react";
import type { LeadWithNames } from "../helpers/leads.type";
import { useLead } from "@/hooks/api/useLeads";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface LeadViewProps {
    lead?: LeadWithNames | null;
    leadId?: number | null;
    isLoading?: boolean;
    className?: string;
}

export function LeadView({
    lead: manualLead,
    leadId,
    isLoading: manualLoading = false,
    className = "",
}: LeadViewProps) {
    const { data: leadData, isLoading: queryLoading } = useLead(
        leadId ? Number(leadId) : null
    );

    const lead = manualLead || leadData;
    const isLoading = manualLoading || queryLoading;

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!lead) {
        return null;
    }

    const priorityColors: Record<string, string> = {
        Hot: "bg-red-100 text-red-800 border-red-300",
        Warm: "bg-yellow-100 text-yellow-800 border-yellow-300",
        Cold: "bg-blue-100 text-blue-800 border-blue-300",
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Lead Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Basic Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Basic Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Company Name
                                </div>
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {lead.companyName || "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Contact Person
                                </div>
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {lead.name || "—"}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Designation
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.designation || "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4" />
                                    Priority
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.leadPriority ? (
                                    <Badge
                                        variant="outline"
                                        className={priorityColors[lead.leadPriority] || ""}
                                    >
                                        {lead.leadPriority}
                                    </Badge>
                                ) : (
                                    "—"
                                )}
                            </TableCell>
                        </TableRow>

                        {/* Contact Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Contact Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Phone
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.phone || "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.email || "—"}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Address
                                </div>
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {lead.address || "—"}
                            </TableCell>
                        </TableRow>

                        {/* Location Details */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Location Details
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Country
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.country || "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                State
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.state || "—"}
                            </TableCell>
                        </TableRow>

                        {/* Business Details */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Business Details
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Industry
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.industryName || "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Lead Type
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.typeName || "—"}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Team
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.teamName || "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                BD Lead
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.bdPersonName || "—"}
                            </TableCell>
                        </TableRow>

                        {/* Follow-up Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Follow-up Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Last Follow Up
                                </div>
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.lastMailSentAt
                                    ? new Date(lead.lastMailSentAt).toLocaleDateString(
                                          "en-IN"
                                      )
                                    : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Recent Follow Up Type
                            </TableCell>
                            <TableCell className="text-sm">
                                {lead.recentFollowUp ? (
                                    <Badge variant="outline" className="capitalize">
                                        {lead.recentFollowUp}
                                    </Badge>
                                ) : (
                                    "—"
                                )}
                            </TableCell>
                        </TableRow>

                        {/* Additional Information */}
                        {(lead.pointsDiscussed || lead.veResponsibility) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Additional Information
                                    </TableCell>
                                </TableRow>
                                {lead.pointsDiscussed && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Points Discussed
                                        </TableCell>
                                        <TableCell
                                            className="text-sm break-words"
                                            colSpan={3}
                                        >
                                            {lead.pointsDiscussed}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {lead.veResponsibility && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            VE Responsibility
                                        </TableCell>
                                        <TableCell
                                            className="text-sm break-words"
                                            colSpan={3}
                                        >
                                            {lead.veResponsibility}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function LeadDetailsSection({ leadId }: { leadId: number | null }) {
    const { data: lead, isLoading } = useLead(leadId);

    if (isLoading && !lead) {
        return <LeadView lead={null} isLoading />;
    }

    return (
        <div className="space-y-6">
            {lead ? (
                <LeadView lead={lead} isLoading={isLoading} />
            ) : (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Lead information not available.</AlertDescription>
                </Alert>
            )}
        </div>
    );
}