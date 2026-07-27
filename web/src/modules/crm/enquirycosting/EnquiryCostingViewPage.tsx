import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, User, FileText, BadgeCheck } from "lucide-react";
import { useEnquiryCosting } from "@/hooks/api/useEnquiryCosting";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EnquiryCosting } from "./helpers/enquirycosting.type";

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

const EnquiryCostingViewPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle>Costing Sheet</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <EnquiryCostingDetailsSection costingId={id ? Number(id) : null} />
            </CardContent>
        </Card>
    );
};

export default EnquiryCostingViewPage;
