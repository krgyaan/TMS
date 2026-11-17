import type { ElementType, ReactNode } from "react";
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Edit,
    ExternalLink,
    FileText,
    IndianRupee,
    Mail,
    MapPin,
    Phone,
    Target,
    User,
    UserCheck,
    UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDate, formatDateTime } from "@/hooks/useFormatedDate";

import { FREQUENCY_LABELS, STOP_REASON_LABELS } from "../helpers/followUp.constants";
import type { FollowUpDetails } from "../helpers/followUp.types";
import { buildFileUrl, getFileName, isImageFile } from "../helpers/followUp.utils";

interface FollowUpViewProps {
    data: FollowUpDetails;
    onBack: () => void;
    onEdit: () => void;
}

function InfoItem({ icon: Icon, label, value }: { icon?: ElementType; label: string; value?: ReactNode }) {
    return (
        <div>
            <div className="mb-1 flex items-center gap-2">
                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            </div>
            <p className="text-sm font-medium">{value || "—"}</p>
        </div>
    );
}

function SectionHeader({ icon: Icon, title, action }: { icon: ElementType; title: string; action?: ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
            </div>
            {action}
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: ElementType; label: string; value: ReactNode }) {
    return (
        <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{value}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
            </div>
        </div>
    );
}

export function FollowUpView({ data, onBack, onEdit }: FollowUpViewProps) {
    const isStopped = data.frequency === 6;
    const frequencyLabel = data.frequency ? FREQUENCY_LABELS[data.frequency] ?? "—" : "—";
    const stopReasonLabel = data.stopReason ? STOP_REASON_LABELS[data.stopReason] ?? "—" : "—";

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.partyName}</h1>
                                <Badge variant={isStopped ? "destructive" : "secondary"}>{frequencyLabel}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Follow-up #{data.id} • Created by {data.creator?.name || "Unknown"}
                            </p>
                        </div>
                    </div>

                    <Button className="shadow-sm" onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard icon={IndianRupee} label="Amount" value={data.amount != null ? formatINR(Number(data.amount)) : "—"} />
                    <StatCard icon={Calendar} label="Next Follow-up" value={formatDate(data.startFrom) || "—"} />
                    <StatCard icon={UserCheck} label="Assigned To" value={data.assignee?.name || "—"} />
                    <StatCard icon={Clock} label="Frequency" value={frequencyLabel} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader className="pb-4">
                                <SectionHeader icon={Building2} title="Basic Information" />
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <InfoItem icon={MapPin} label="Area" value={data.area} />
                                <InfoItem icon={Building2} label="Party Name" value={data.partyName} />
                                <InfoItem icon={Target} label="Follow-up For" value={data.followupFor} />
                                <InfoItem icon={IndianRupee} label="Amount" value={data.amount != null ? formatINR(Number(data.amount)) : "—"} />
                                <InfoItem icon={UserCheck} label="Assigned To" value={data.assignee?.name} />
                                <InfoItem icon={UserPlus} label="Created By" value={data.creator?.name} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-4">
                                <SectionHeader icon={Clock} title="Follow-up Status" />
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <InfoItem icon={Calendar} label="Start From" value={formatDateTime(data.startFrom)} />
                                    <InfoItem icon={Calendar} label="Next Follow-up" value={formatDate(data.nextFollowUpDate ?? data.startFrom)} />
                                    <InfoItem icon={Clock} label="Frequency" value={frequencyLabel} />
                                    <InfoItem icon={AlertCircle} label="Status" value={data.status} />
                                </div>

                                {isStopped && (
                                    <>
                                        <Separator />
                                        <div className="space-y-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-destructive/10 p-2">
                                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Stop Reason
                                                    </p>
                                                    <p className="font-medium text-destructive">{stopReasonLabel}</p>
                                                </div>
                                            </div>

                                            {data.stopReason === 2 && data.proofText && (
                                                <div className="pl-11">
                                                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Proof Details
                                                    </p>
                                                    <p className="rounded-lg border bg-background/50 p-3 text-sm">{data.proofText}</p>
                                                </div>
                                            )}

                                            {data.stopReason === 2 && data.proofImagePath && (
                                                <div className="space-y-2 pl-11">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Proof Image
                                                    </p>
                                                    <div className="overflow-hidden rounded-xl border bg-muted">
                                                        <img
                                                            src={buildFileUrl(data.proofImagePath)}
                                                            alt="Proof of objective achievement"
                                                            className="max-h-64 w-full bg-background object-contain"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {data.stopReason === 4 && data.stopRemarks && (
                                                <div className="pl-11">
                                                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                        Stop Remarks
                                                    </p>
                                                    <p className="rounded-lg border bg-background/50 p-3 text-sm">{data.stopRemarks}</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={FileText}
                                    title="Attachments"
                                    action={
                                        data.attachments?.length ? (
                                            <Badge variant="secondary">{data.attachments.length} file(s)</Badge>
                                        ) : null
                                    }
                                />
                            </CardHeader>
                            <CardContent>
                                {data.attachments?.length ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {data.attachments.map((attachment, index) => {
                                            const url = buildFileUrl(attachment);
                                            return (
                                                <div key={`${attachment}-${index}`} className="rounded-xl border p-4">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium">{getFileName(url)}</p>
                                                            <p className="text-xs text-muted-foreground">Attachment {index + 1}</p>
                                                        </div>
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <a href={url} target="_blank" rel="noreferrer">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <a href={url} download>
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    </div>
                                                    {isImageFile(url) && (
                                                        <div className="mt-3 overflow-hidden rounded-lg bg-muted">
                                                            <img src={url} alt={getFileName(url)} className="h-32 w-full object-cover" loading="lazy" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="py-6 text-center text-sm text-muted-foreground">No attachments found.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={User}
                                    title="Contact Persons"
                                    action={data.contacts?.length ? <Badge variant="secondary">{data.contacts.length}</Badge> : null}
                                />
                            </CardHeader>
                            <CardContent>
                                {data.contacts?.length ? (
                                    <div className="space-y-3">
                                        {data.contacts.map((contact, index) => (
                                            <div key={contact.id ?? index} className="rounded-xl border p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                        <User className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <p className="truncate font-medium">{contact.name || "—"}</p>
                                                        {contact.phone && (
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Phone className="h-3.5 w-3.5" />
                                                                <a href={`tel:${contact.phone}`} className="truncate hover:text-primary">
                                                                    {contact.phone}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {contact.email && (
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Mail className="h-3.5 w-3.5" />
                                                                <a href={`mailto:${contact.email}`} className="truncate hover:text-primary">
                                                                    {contact.email}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-6 text-center text-sm text-muted-foreground">No contacts found.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-4">
                                <SectionHeader icon={CheckCircle2} title="Activity" />
                            </CardHeader>
                            <CardContent>
                                <p className="py-6 text-center text-sm text-muted-foreground">Activity history will appear here.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
