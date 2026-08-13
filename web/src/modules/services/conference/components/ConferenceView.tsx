import { FileText, Download, Mic, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useUsers } from "@/hooks/api/useUsers";
import { conferenceAttachmentUrl } from "../helpers/conference.types";
import type { ConferenceCallReport } from "../helpers/conference.types";

const sectionCls = "py-1 px-6";
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
            <TableCell className="text-sm font-medium text-muted-foreground w-[18%]">
                {label}
            </TableCell>
            <TableCell className="text-sm font-semibold w-[32%]">
                {value ?? "—"}
            </TableCell>
        </>
    );
}

export function ConferenceView({ conference }: { conference: ConferenceCallReport }) {
    const { data: allUsers = [] } = useUsers();
    const createdByUser = allUsers.find(u => u.id === conference.createdBy);
    const createdByName = createdByUser?.name ?? "—";

    return (
        <Card className="overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Conference Call Report
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Ticket #{conference.complaintId} • Report #{conference.id}
                </p>
            </div>

            {/* ── 1. Issue Description & Materials — side by side ──────────── */}
            <div className={sectionCls}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <SectionTitle icon={<FileText className="h-4 w-4" />}>
                            Issue Description
                        </SectionTitle>
                        <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">
                            {conference.issueDescription || "—"}
                        </div>
                    </div>
                    <div>
                        <SectionTitle icon={<FileText className="h-4 w-4" />}>
                            Materials/Tools Required
                        </SectionTitle>
                        <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">
                            {conference.materialsRequired || "—"}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. Actions Planned ───────────────────────────────────────── */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>
                    Actions Planned
                </SectionTitle>
                <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">
                    {conference.actionsPlanned || "—"}
                </div>
            </div>

            {/* ── 3. Voice Recording & Photos — side by side ───────────────── */}
            <div className={sectionCls}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Voice Recording */}
                    <div>
                        <SectionTitle icon={<Mic className="h-4 w-4" />}>
                            Phone Voice Recording
                        </SectionTitle>
                        {conference.voiceRecordingPath ? (
                            <a
                                href={conferenceAttachmentUrl(conference.voiceRecordingPath)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                                <Download className="h-4 w-4" />
                                View Attachment
                            </a>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No voice recording uploaded.
                            </p>
                        )}
                    </div>

                    {/* Right: Additional Photos/Videos */}
                    <div>
                        <SectionTitle icon={<ImageIcon className="h-4 w-4" />}>
                            Additional Photos/Videos
                        </SectionTitle>
                        {conference.attachments && conference.attachments.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-3">
                                {conference.attachments.map((att, idx) => (
                                    <a
                                        key={idx}
                                        href={conferenceAttachmentUrl(att.path)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                    >
                                        <FileText className="h-4 w-4" />
                                        View Attachment
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No attachments uploaded.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 4. Created By ────────────────────────────────────────────── */}
            <div className={sectionCls}>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Created By" value={createdByName} />
                                <InfoCell label="" value={null} />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </Card>
    );
}