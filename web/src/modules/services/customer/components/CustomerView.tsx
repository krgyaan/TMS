import type { ReactNode } from "react";
import { FileText, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/hooks/useFormatedDate";
import type { CustomerComplaintDetail } from "../helpers/customer.types";
import { customerAttachmentUrl } from "../helpers/customer.types";

const sectionCls = "py-6 px-6 border-b last:border-b-0";

const sectionTitleCls =
    "text-sm font-semibold flex items-center gap-2 text-foreground mb-4";

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <h3 className={sectionTitleCls}>
            {icon}
            {children}
        </h3>
    );
}

function InfoCell({ label, value }: { label: string; value: ReactNode }) {
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

export function CustomerView({ complaint }: { complaint: CustomerComplaintDetail }) {
    const isImage = complaint.attachment?.match(/\.(jpg|jpeg|png|webp)$/i);
    const isVideo = complaint.attachment?.match(/\.(mp4|mov|webm|mkv)$/i);

    return (
        <Card className="overflow-hidden">
            {/* ── Card header ─────────────────────────────────────────────── */}
            <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Customer Complaint
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Full details for ticket {complaint.ticketNo ?? `#${complaint.id}`}
                </p>
            </div>

            {/* ── 1. Basic Information ────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>
                    Basic Information
                </SectionTitle>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Ticket No." value={complaint.ticketNo ?? "—"} />
                                <InfoCell label="Name" value={complaint.name} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Organization" value={complaint.organization} />
                                <InfoCell label="Designation" value={complaint.designation} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Email" value={complaint.email} />
                                <InfoCell label="Phone No." value={complaint.phone} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell
                                    label="Status"
                                    value={
                                        <Badge variant="outline" className="capitalize">
                                            {complaint.status ?? "Pending"}
                                        </Badge>
                                    }
                                />
                                <InfoCell label="Created Date" value={formatDateTime(complaint.createdAt)} />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* ── 2. Site / Project Information ───────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>
                    Site / Project Information
                </SectionTitle>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Site/Project Name" value={complaint.siteProjectName} />
                                <InfoCell label="Site Location" value={complaint.siteLocation} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="PO No." value={complaint.poNo} />
                                <InfoCell label="Last Updated" value={formatDate(complaint.updatedAt)} />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* ── 3. Issue Faced ──────────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>
                    Issue Faced
                </SectionTitle>
                <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground">
                    {complaint.issueFaced || "—"}
                </div>
            </div>

            {/* ── 4. Attachment ───────────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<Download className="h-4 w-4" />}>
                    Photo / Video
                </SectionTitle>
                {!complaint.attachment ? (
                    <p className="text-sm text-muted-foreground">No attachment uploaded.</p>
                ) : (
                    <div className="space-y-3">
                        <a
                            href={customerAttachmentUrl(complaint.attachment)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            <Download className="h-4 w-4" />
                            Open attachment
                        </a>
                        {isImage && (
                            <div className="max-w-md rounded-lg border overflow-hidden">
                                <img
                                    src={customerAttachmentUrl(complaint.attachment)}
                                    alt="Customer complaint attachment"
                                    className="w-full object-cover"
                                />
                            </div>
                        )}
                        {isVideo && (
                            <video
                                controls
                                className="max-w-md rounded-lg border"
                                src={customerAttachmentUrl(complaint.attachment)}
                            />
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
