import { FileText, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { serviceVisitAttachmentUrl } from "../helpers/service-visit.types";
import type { ServiceVisitReport } from "../helpers/service-visit.types";

const sectionCls = "py-6 px-6 border-b last:border-b-0";
const sectionTitleCls = "text-sm font-semibold flex items-center gap-2 text-foreground mb-4";

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <h3 className={sectionTitleCls}>
            {icon}
            {children}
        </h3>
    );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <>
            <TableCell className="text-sm font-medium text-muted-foreground w-[18%]">{label}</TableCell>
            <TableCell className="text-sm font-semibold w-[32%]">{value ?? "—"}</TableCell>
        </>
    );
}

function PhotoGrid({ photos }: { photos: ServiceVisitReport["resolvedPhoto"] }) {
    if (!photos || photos.length === 0) {
        return <p className="text-sm text-muted-foreground">No photos uploaded.</p>;
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((att, idx) => {
                const isImage = (att.name || att.path).match(/\.(jpg|jpeg|png|webp)$/i);
                return (
                    <div key={idx} className="rounded-lg border overflow-hidden">
                        {isImage ? (
                            <img src={serviceVisitAttachmentUrl(att.path)} alt={att.name || `Photo ${idx + 1}`} className="w-full h-40 object-cover" />
                        ) : (
                            <div className="p-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <a href={serviceVisitAttachmentUrl(att.path)} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                                    {att.name || att.path.split("/").pop() || `Photo ${idx + 1}`}
                                </a>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function ServiceReportView({ report }: { report: ServiceVisitReport }) {
    return (
        <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Service Visit Report
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Ticket #{report.complaintId} • Report #{report.id}
                </p>
            </div>

            {/* Basic Information */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>Basic Information</SectionTitle>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Visit Date & Time" value={report.visitDate ? formatDateTime(report.visitDate) : "—"} />
                                <InfoCell label="Resolution Done" value={report.resolutionDone === "1" ? "Yes" : report.resolutionDone === "0" ? "No" : "—"} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Created By" value={report.uploadedBy ?? "—"} />
                                <InfoCell label="Created Date" value={formatDateTime(report.createdAt)} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Updated Date" value={formatDateTime(report.updatedAt)} />
                                <InfoCell label="" value={null} />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Remarks */}
            <div className={sectionCls}>
                <SectionTitle icon={<CheckCircle2 className="h-4 w-4" />}>Remarks</SectionTitle>
                <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">{report.remarks || "—"}</div>
            </div>

            {/* Photo after resolution */}
            <div className={sectionCls}>
                <SectionTitle icon={<ImageIcon className="h-4 w-4" />}>Photo After Resolution</SectionTitle>
                <PhotoGrid photos={report.resolvedPhoto} />
            </div>

            {/* Customer-signed visit report */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>Customer-Signed Visit Report</SectionTitle>
                <PhotoGrid photos={report.signedPhoto} />
            </div>
        </Card>
    );
}
