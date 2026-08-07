import { useState } from "react";
import { FileText, FileSignature, FileUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/hooks/useFormatedDate";
import { cn } from "@/lib/utils";
import type { AmcServiceDetail } from "@/modules/services/amc/helpers/amc.types";
import { serviceFileUrl } from "@/modules/services/amc/helpers/amc.types";
import { UploadServiceReportModal } from "./UploadServiceReportModal";
import type { ServicePathField } from "@/modules/services/amc/helpers/amc.types";

export function AmcServiceView({ service }: { service: AmcServiceDetail }) {
    const [uploadModal, setUploadModal] = useState<{
        open: boolean;
        field: ServicePathField;
    }>({ open: false, field: "filled-service-report" });

    const openUpload = (field: ServicePathField) => setUploadModal({ open: true, field });

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>{service.amc?.projectName ?? "Project"}</CardTitle>
                            <CardDescription>
                                Service No. {service.serviceNo} — due {formatDate(service.serviceDueDate)}
                            </CardDescription>
                        </div>
                        <Badge
                            variant="outline"
                            className={cn(
                                "capitalize",
                                service.status === "Done"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-amber-100 text-amber-800 border-amber-200",
                            )}
                        >
                            {service.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-6">
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Site
                                </TableCell>
                                <TableCell className="text-sm">
                                    <div className="flex flex-col">
                                        <span>{service.site?.name ?? "—"}</span>
                                        {service.site?.address && (
                                            <span className="text-xs text-muted-foreground">
                                                {service.site.address}
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
                                    {service.site?.contacts?.[0] ? (
                                        <div className="flex flex-col">
                                            <span>{service.site.contacts[0].name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {service.site.contacts[0].mobile}
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
                                    {service.amc?.serviceEngineers?.[0]?.name ?? "—"}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Service Due Date
                                </TableCell>
                                <TableCell className="text-sm">{formatDate(service.serviceDueDate)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="w-1/3 text-sm font-medium text-muted-foreground">
                                    Service Completed Date
                                </TableCell>
                                <TableCell className="text-sm">{formatDate(service.serviceCompletedDate)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Filled Service Report
                            </p>
                            {service.filledReport ? (
                                <a
                                    href={serviceFileUrl(service.filledReport)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                    <FileText className="h-3.5 w-3.5" /> View
                                </a>
                            ) : (
                                <span className="text-sm text-muted-foreground">Not uploaded</span>
                            )}
                            <div className="mt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => openUpload("filled-service-report")}
                                >
                                    <FileUp className="h-3.5 w-3.5 mr-1" /> Upload
                                </Button>
                            </div>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Signed Service Report
                            </p>
                            {service.signedReport ? (
                                <a
                                    href={serviceFileUrl(service.signedReport)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                    <FileSignature className="h-3.5 w-3.5" /> View
                                </a>
                            ) : (
                                <span className="text-sm text-muted-foreground">Not uploaded</span>
                            )}
                            <div className="mt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => openUpload("signed-service-report")}
                                >
                                    <FileSignature className="h-3.5 w-3.5 mr-1" /> Upload
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <UploadServiceReportModal
                open={uploadModal.open}
                onOpenChange={open => setUploadModal(prev => ({ ...prev, open }))}
                serviceId={service.id}
                field={uploadModal.field}
            />
        </>
    );
}
