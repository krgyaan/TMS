import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useAmcBilling } from "@/hooks/api/useAmcBilling";
import { paths } from "@/app/routes/paths";
import { billingFileUrl } from "./helpers/amc-billing.types";

const STATUS_STYLES: Record<string, string> = {
    "Signed Service reports Received": "bg-amber-100 text-amber-800 border-amber-200",
    "Bill Submitted": "bg-blue-100 text-blue-800 border-blue-200",
    "Payment Received": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const fmtDate = (value: string | null | undefined) =>
    value ? format(new Date(value), "MMM d, yyyy") : "—";

const fmtDateTime = (value: string | null | undefined) =>
    value ? format(new Date(value), "MMM d, yyyy hh:mm a") : "—";

export default function AmcBillingShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const billingId = Number(id);

    const { data: billing, isLoading } = useAmcBilling(billingId);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!billing) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.amcBilling)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <p className="text-sm text-muted-foreground">Billing record not found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(paths.services.amcBilling)}
                className="-ml-2"
            >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to AMC Billing
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>{billing.amc?.projectName ?? "Project"}</CardTitle>
                            <CardDescription>
                                Billing record for completed service #{billing.id}
                            </CardDescription>
                        </div>
                        <Badge
                            variant="outline"
                            className={
                                STATUS_STYLES[billing.status] ??
                                "bg-muted text-muted-foreground border-transparent"
                            }
                        >
                            {billing.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    TE Name
                                </TableCell>
                                <TableCell className="text-sm">{billing.amc?.teamName ?? "—"}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Site
                                </TableCell>
                                <TableCell className="text-sm">
                                    <div className="flex flex-col">
                                        <span>{billing.site?.name ?? "—"}</span>
                                        {billing.site?.address && (
                                            <span className="text-xs text-muted-foreground">
                                                {billing.site.address}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Contact
                                </TableCell>
                                <TableCell className="text-sm">
                                    {billing.site?.contacts?.[0] ? (
                                        <div className="flex flex-col">
                                            <span>{billing.site.contacts[0].name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {billing.site.contacts[0].mobile}
                                            </span>
                                        </div>
                                    ) : (
                                        "—"
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Service Engg Name
                                </TableCell>
                                <TableCell className="text-sm">
                                    {billing.amc?.serviceEngineers?.[0]?.name ?? "—"}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Service Due Date
                                </TableCell>
                                <TableCell className="text-sm">{fmtDate(billing.serviceDueDate)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Service Completed Date
                                </TableCell>
                                <TableCell className="text-sm">{fmtDateTime(billing.serviceCompletedDate)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Signed Service report Received
                                </TableCell>
                                <TableCell className="text-sm">
                                    {billing.amc?.signedServiceReportPath ? (
                                        <a
                                            href={`/uploads/amc/${billing.amc.signedServiceReportPath}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <FileText className="h-3.5 w-3.5" /> Open
                                        </a>
                                    ) : (
                                        "—"
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Invoice
                                </TableCell>
                                <TableCell className="text-sm">
                                    {billing.invoice ? (
                                        <a
                                            href={billingFileUrl(billing.invoice)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <FileText className="h-3.5 w-3.5" /> Open
                                        </a>
                                    ) : (
                                        "—"
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Payment Receipt
                                </TableCell>
                                <TableCell className="text-sm">
                                    {billing.paymentReceipt ? (
                                        <a
                                            href={billingFileUrl(billing.paymentReceipt)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <FileText className="h-3.5 w-3.5" /> Open
                                        </a>
                                    ) : (
                                        "—"
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Notes
                                </TableCell>
                                <TableCell className="text-sm">{billing.notes ?? "—"}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
