import { FileText, Download, Mic, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { conferenceAttachmentUrl } from "../helpers/conference.types";
import type { ConferenceCallReport } from "../helpers/conference.types";

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

export function ConferenceView({ conference }: { conference: ConferenceCallReport }) {
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

            {/* Basic Information */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>Basic Information</SectionTitle>
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Created By" value={conference.createdBy ?? "—"} />
                                <InfoCell label="Created Date" value={formatDateTime(conference.createdAt)} />
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <InfoCell label="Updated Date" value={formatDateTime(conference.updatedAt)} />
                                <InfoCell label="" value={null} />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Issue Description */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>Issue Description</SectionTitle>
                <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">{conference.issueDescription || "—"}</div>
            </div>

            {/* Materials Required */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>Materials/Tools Required</SectionTitle>
                <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">{conference.materialsRequired || "—"}</div>
            </div>

            {/* Actions Planned */}
            <div className={sectionCls}>
                <SectionTitle icon={<FileText className="h-4 w-4" />}>Actions Planned</SectionTitle>
                <div className="rounded-lg border px-4 py-3 bg-muted/10 text-sm text-foreground whitespace-pre-wrap">{conference.actionsPlanned || "—"}</div>
            </div>

            {/* Voice Recording */}
            <div className={sectionCls}>
                <SectionTitle icon={<Mic className="h-4 w-4" />}>Phone Voice Recording</SectionTitle>
                {conference.voiceRecordingPath ? (
                    <div className="space-y-2">
                        <a
                            href={conferenceAttachmentUrl(conference.voiceRecordingPath)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            <Download className="h-4 w-4" />
                            Listen to recording
                        </a>
                        <div className="mt-2">
                            <audio controls className="w-full" src={conferenceAttachmentUrl(conference.voiceRecordingPath)} />
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No voice recording uploaded.</p>
                )}
            </div>

            {/* Attachments */}
            <div className={sectionCls}>
                <SectionTitle icon={<ImageIcon className="h-4 w-4" />}>Additional Photos/Videos</SectionTitle>
                {conference.attachments && conference.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {conference.attachments.map((att, idx) => {
                            const isImage = (att.name || att.path).match(/\.(jpg|jpeg|png|webp)$/i);
                            const isVideo = (att.name || att.path).match(/\.(mp4|mov|webm|mkv)$/i);
                            return (
                                <div key={idx} className="rounded-lg border overflow-hidden">
                                    {isImage ? (
                                        <img src={conferenceAttachmentUrl(att.path)} alt={att.name || `Attachment ${idx + 1}`} className="w-full h-40 object-cover" />
                                    ) : isVideo ? (
                                        <video controls className="w-full h-40 object-cover" src={conferenceAttachmentUrl(att.path)} />
                                    ) : (
                                        <div className="p-4 flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <a href={conferenceAttachmentUrl(att.path)} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                                                {att.name || att.path.split("/").pop() || `Attachment ${idx + 1}`}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No attachments uploaded.</p>
                )}
            </div>
        </Card>
    );
}
