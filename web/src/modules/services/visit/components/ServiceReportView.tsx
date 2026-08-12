import { FileText, Calendar, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { useUsers } from "@/hooks/api/useUsers";
import { serviceVisitAttachmentUrl } from "../helpers/service-visit.types";
import type { ServiceVisitReport } from "../helpers/service-visit.types";

const sectionCls = " px-6";
const sectionTitleCls = "text-sm font-semibold flex items-center gap-2 text-foreground mb-4";

function SectionTitle({
    icon,
    children,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return <h3 className={sectionTitleCls}>{icon}{children}</h3>;
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <>
            <TableCell className="text-sm font-medium text-muted-foreground w-[18%]">
                {label}
            </TableCell>
            <TableCell className="text-sm font-semibold w-[32%]">
                {value ?? "—"}
            </TableCell>
        </>
    );
}

function AttachmentList({
    photos,
}: {
    photos:
        | ServiceVisitReport["resolvedPhoto"]
        | ServiceVisitReport["signedPhoto"];
}) {
    if (!photos || photos.length === 0) {
        return <p className="text-sm text-muted-foreground">No photos uploaded.</p>;
    }
    return (
        <div className="flex flex-wrap items-center gap-3">
            {photos.map((att, idx) => (
                <a
                    key={idx}
                    href={serviceVisitAttachmentUrl(att.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                    <FileText className="h-4 w-4" />
                    View Attachment
                </a>
            ))}
        </div>
    );
}

export function ServiceReportView({ report }: { report: ServiceVisitReport }) {
    const { data: allUsers = [] } = useUsers();
    const uploadedByUser = allUsers.find(u => u.id === report.uploadedBy);
    const uploadedByName = uploadedByUser?.name ?? "—";

    return (
        <Card className="overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Service Visit Report
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Ticket #{report.complaintId} • Report #{report.id}
                </p>
            </div>

            {/* ── 1. Visit Details ─────────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<Calendar className="h-4 w-4" />}>
                    Visit Details
                </SectionTitle>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell
                                    label="Visit Date & Time"
                                    value={
                                        report.visitDate
                                            ? formatDateTime(report.visitDate)
                                            : "—"
                                    }
                                />
                                <InfoCell
                                    label="Resolution Done"
                                    value={
                                        report.resolutionDone === "1"
                                            ? "Yes"
                                            : report.resolutionDone === "0"
                                              ? "No"
                                              : "—"
                                    }
                                />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* ── 2. Remarks ───────────────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<CheckCircle2 className="h-4 w-4" />}>
                    Remarks
                </SectionTitle>
                <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">
                    {report.remarks || "—"}
                </div>
            </div>

            {/* ── 3. Photos — side by side ────────────────────────────────── */}
            <div className={sectionCls}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Photo after resolution */}
                    <div>
                        <SectionTitle icon={<ImageIcon className="h-4 w-4" />}>
                            Photo After Resolution
                        </SectionTitle>
                        <AttachmentList photos={report.resolvedPhoto} />
                    </div>

                    {/* Right: Customer-signed visit report */}
                    <div>
                        <SectionTitle icon={<FileText className="h-4 w-4" />}>
                            Customer-Signed Visit Report
                        </SectionTitle>
                        <AttachmentList photos={report.signedPhoto} />
                    </div>
                </div>
            </div>

            {/* ── 4. Created By ────────────────────────────────────────────── */}
            <div className={sectionCls}>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Created By" value={uploadedByName} />
                                <InfoCell label="" value={null} />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </Card>
    );
}