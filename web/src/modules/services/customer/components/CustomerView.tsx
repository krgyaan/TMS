import type { ReactNode } from "react";
import { FileText, Download, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { useUsers } from "@/hooks/api/useUsers";
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
    const { data: allUsers = [] } = useUsers();
    const createdByUser = allUsers.find(u => u.id === complaint.createdBy);
    const createdByName = createdByUser?.name ?? "—";

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
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Created By" value={createdByName} />
                                <InfoCell label="" value={null} />
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
                                <InfoCell label="" value={null} />
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

            {/* ── 4. Service Engineers ────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<Wrench className="h-4 w-4" />}>
                    Service Engineers
                </SectionTitle>

                {complaint.engineers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No engineers allotted.</p>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Mobile No.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {complaint.engineers.map((engineer, idx) => (
                                    <TableRow key={engineer.id ?? idx} className="hover:bg-muted/30">
                                        <TableCell className="text-sm font-medium">
                                            {engineer.name}
                                        </TableCell>
                                        <TableCell className="text-sm">{engineer.email || "—"}</TableCell>
                                        <TableCell className="text-sm">{engineer.phone || "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* ── 5. Attachment ───────────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<Download className="h-4 w-4" />}>
                    Photo / Video
                </SectionTitle>
                {!complaint.attachment ? (
                    <p className="text-sm text-muted-foreground">No attachment uploaded.</p>
                ) : (
                    <a
                        href={customerAttachmentUrl(complaint.attachment)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                        <Download className="h-4 w-4" />
                        View Attachment
                    </a>
                )}
            </div>
        </Card>
    );
}
