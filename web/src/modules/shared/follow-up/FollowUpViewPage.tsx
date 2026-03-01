import React from "react";
import { useNavigate, useParams } from "react-router-dom";

/* UI */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/* Icons */
import {
    ArrowLeft,
    Edit,
    Building2,
    User,
    Phone,
    Mail,
    FileText,
    Clock,
    Calendar,
    IndianRupee,
    MapPin,
    Target,
    UserCheck,
    UserPlus,
    CalendarClock,
    AlertCircle,
    CheckCircle2,
    PauseCircle,
    ExternalLink,
    Copy,
    Download,
    FileImage,
    File,
    MoreHorizontal,
    Share2,
    Printer,
} from "lucide-react";

/* Data */
import { useFollowUp } from "./follow-up.hooks";
import { paths } from "@/app/routes/paths";

/* ================================
   CONSTANTS
================================ */

const FREQUENCY_CONFIG: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
    3: { label: "2 times a day", variant: "secondary", icon: Calendar },
    1: { label: "Daily", variant: "default", icon: Clock },
    2: { label: "Alternate Days", variant: "default", icon: Clock },
    4: { label: "Weekly (every Mon)", variant: "secondary", icon: Calendar },
    5: { label: "Twice a Week (every Mon & Thu)", variant: "outline", icon: CalendarClock },
    6: { label: "Stop", variant: "destructive", icon: PauseCircle },
};
const STOP_REASON_LABELS: Record<number, string> = {
    1: "Person is getting angry / requested to stop",
    2: "Objective Achieved",
    3: "External Followup Initiated",
    4: "Remarks",
};

const STOP_REASON_ICONS: Record<number, React.ElementType> = {
    1: AlertCircle,
    2: CheckCircle2,
    3: ExternalLink,
    4: FileText,
};

/* ================================
   HELPERS
================================ */

const formatDate = (date?: string | null) =>
    date
        ? new Date(date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : null;

const formatDateLong = (date?: string | null) =>
    date
        ? new Date(date).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
          })
        : null;

const formatCurrency = (amount?: number | null) =>
    amount
        ? new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
          }).format(amount)
        : null;

const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

const getFileIcon = (url: string) => {
    const ext = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
        return FileImage;
    }
    if (ext === "pdf") {
        return FileText;
    }
    return File;
};

const getFileName = (url: string) => {
    const parts = url.split("/");
    return parts[parts.length - 1] || url;
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
};

/* ================================
   LOADING SKELETON
================================ */

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <div className="mx-auto max-w-6xl p-6 space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-24" />
                </div>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>

                {/* Cards Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-64 rounded-xl" />
                        <Skeleton className="h-48 rounded-xl" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-64 rounded-xl" />
                        <Skeleton className="h-48 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ================================
   ERROR STATE
================================ */

function ErrorState({ onBack }: { onBack: () => void }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
            <Card className="max-w-md w-full">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold">Unable to Load Follow-up</h2>
                            <p className="text-muted-foreground text-sm">
                                We couldn't find the follow-up you're looking for. It may have been deleted or you don't have permission to view it.
                            </p>
                        </div>
                        <Button onClick={onBack} className="mt-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ================================
   STAT CARD
================================ */

function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    variant = "default",
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    subValue?: string;
    variant?: "default" | "primary" | "success" | "warning" | "destructive";
}) {
    const variantStyles = {
        default: "bg-card border",
        primary: "bg-primary/5 border-primary/20",
        success: "bg-emerald-500/5 border-emerald-500/20",
        warning: "bg-amber-500/5 border-amber-500/20",
        destructive: "bg-destructive/5 border-destructive/20",
    };

    const iconStyles = {
        default: "bg-muted text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        destructive: "bg-destructive/10 text-destructive",
    };

    return (
        <div
            className={`
                rounded-xl border p-4 transition-all duration-200
                hover:shadow-md hover:-translate-y-0.5
                ${variantStyles[variant]}
            `}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                    {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
                </div>
                <div className={`p-2.5 rounded-lg ${iconStyles[variant]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

/* ================================
   INFO ITEM
================================ */

function InfoItem({
    icon: Icon,
    label,
    value,
    copyable = false,
    className = "",
}: {
    icon?: React.ElementType;
    label: string;
    value?: React.ReactNode;
    copyable?: boolean;
    className?: string;
}) {
    const displayValue = value || "-";
    const canCopy = copyable && value && typeof value === "string";

    return (
        <div className={`group ${className}`}>
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{displayValue}</p>
                {canCopy && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => copyToClipboard(value as string)}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy to clipboard</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
}

/* ================================
   SECTION HEADER
================================ */

function SectionHeader({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
            </div>
            {action}
        </div>
    );
}

/* ================================
   CONTACT CARD
================================ */

function ContactCard({ name, phone, email, isPrimary = false }: { name: string; phone?: string | null; email?: string | null; isPrimary?: boolean }) {
    return (
        <div
            className={`
                group relative rounded-xl border p-4 
                transition-all duration-200 hover:shadow-md hover:border-primary/30
                ${isPrimary ? "bg-primary/5 border-primary/20" : "bg-card"}
            `}
        >
            {isPrimary && (
                <Badge variant="secondary" className="absolute -top-2 right-3 text-[10px] px-2 py-0">
                    Primary
                </Badge>
            )}

            <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{getInitials(name)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-medium truncate">{name}</p>

                    {phone && (
                        <div className="flex items-center gap-2 group/item">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <a href={`tel:${phone}`} className="text-sm text-muted-foreground hover:text-primary transition-colors truncate">
                                {phone}
                            </a>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0"
                                onClick={() => copyToClipboard(phone)}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    )}

                    {email && (
                        <div className="flex items-center gap-2 group/item">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-primary transition-colors truncate">
                                {email}
                            </a>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0"
                                onClick={() => copyToClipboard(email)}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ================================
   ATTACHMENT CARD
================================ */

const buildFileUrl = (value?: unknown): string => {
    if (typeof value !== "string" || !value) return "";

    // already a full URL (S3, CDN, etc.)
    if (value.startsWith("http")) return value;

    return `/uploads/accounts/${value}`;
};

function AttachmentCard({ url, index }: { url: unknown; index: number }) {
    const fileUrl = buildFileUrl(url);

    if (!fileUrl) return null;

    const FileIcon = getFileIcon(fileUrl);
    const fileName = getFileName(fileUrl);

    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileUrl.split(".").pop()?.toLowerCase() ?? "");

    return (
        <div
            className={`
                group relative rounded-xl border bg-card p-4
                transition-all duration-200 hover:shadow-md hover:border-primary/30
            `}
        >
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted flex-shrink-0">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={fileName}>
                        {fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">Attachment {index + 1}</p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <a href={fileUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open in new tab</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <a href={fileUrl} download>
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {isImage && (
                <div className="mt-3 rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt={fileName} className="w-full h-32 object-cover" loading="lazy" />
                </div>
            )}
        </div>
    );
}

/* ================================
   EMPTY STATE
================================ */

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-muted mb-3">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
    );
}

/* ================================
   MAIN PAGE
================================ */

export default function FollowupViewPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const followupId = Number(id);

    const { data: followup, isLoading, isError } = useFollowUp(followupId);

    if (isLoading) return <LoadingSkeleton />;
    if (isError || !followup) return <ErrorState onBack={() => navigate(-1)} />;

    const isStopped = followup.frequency === 6;
    const frequencyConfig = FREQUENCY_CONFIG[followup.frequency];
    const StopReasonIcon = followup.stopReason ? STOP_REASON_ICONS[followup.stopReason] : AlertCircle;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <div className="mx-auto max-w-6xl p-6 space-y-6">
                {/* ===== HEADER ===== */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shadow-sm" onClick={() => navigate(-1)}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Go back</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{followup.partyName}</h1>
                                <Badge variant={frequencyConfig?.variant || "secondary"} className="hidden sm:inline-flex">
                                    {frequencyConfig?.label || "N/A"}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mt-1">
                                Follow-up #{followup.id} • Created by {followup.creator?.name || "Unknown"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button className="shadow-sm" onClick={() => navigate(paths.shared.followUpEdit(followup.id))}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </div>

                {/* ===== STAT CARDS ===== */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={IndianRupee} label="Amount" value={formatCurrency(followup.amount) || "-"} variant="primary" />
                    <StatCard
                        icon={Calendar}
                        label="Next Follow-up"
                        value={formatDate(followup.startFrom) || "-"}
                        subValue={followup.startFrom ? (new Date(followup.startFrom) > new Date() ? "Upcoming" : "Overdue") : undefined}
                        variant={followup.startFrom && new Date(followup.startFrom) < new Date() ? "warning" : "default"}
                    />
                    <StatCard icon={UserCheck} label="Assigned To" value={followup.assignee?.name || "-"} />
                    <StatCard icon={frequencyConfig?.icon || Clock} label="Frequency" value={frequencyConfig?.label || "N/A"} variant={isStopped ? "destructive" : "success"} />
                </div>

                {/* ===== MAIN CONTENT ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <SectionHeader icon={Building2} title="Basic Information" />
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <InfoItem icon={MapPin} label="Area" value={followup.area} />
                                    <InfoItem icon={Building2} label="Party Name" value={followup.partyName} />
                                    <InfoItem icon={Target} label="Follow-up For" value={followup.followupFor} />
                                    <InfoItem icon={IndianRupee} label="Amount" value={formatCurrency(followup.amount)} />
                                    <InfoItem icon={UserCheck} label="Assigned To" value={followup.assignee?.name} />
                                    <InfoItem icon={UserPlus} label="Created By" value={followup.creator?.name} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Follow-up Status */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={Clock}
                                    title="Follow-up Status"
                                    action={
                                        <Badge variant={frequencyConfig?.variant || "secondary"} className="gap-1">
                                            {frequencyConfig?.icon && <frequencyConfig.icon className="h-3 w-3" />}
                                            {frequencyConfig?.label}
                                        </Badge>
                                    }
                                />
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <InfoItem icon={CalendarClock} label="Start From" value={formatDateLong(followup.startFrom)} />
                                    <InfoItem icon={Calendar} label="Next Follow-up" value={formatDate(followup.startFrom)} />
                                </div>

                                {isStopped && (
                                    <>
                                        <Separator />

                                        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-destructive/10">
                                                    <StopReasonIcon className="h-4 w-4 text-destructive" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stop Reason</p>
                                                    <p className="font-medium text-destructive">{followup.stopReason ? STOP_REASON_LABELS[followup.stopReason] : "-"}</p>
                                                </div>
                                            </div>

                                            {followup.stopReason === 2 && followup.proofText && (
                                                <div className="pl-11">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Proof Details</p>
                                                    <p className="text-sm bg-background/50 rounded-lg p-3 border">{followup.proofText}</p>
                                                </div>
                                            )}

                                            {followup.stopReason === 2 && followup.proofImagePath && (
                                                <div className="pl-11 space-y-2">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proof Image</p>

                                                    <div className="rounded-xl overflow-hidden border bg-muted">
                                                        <img
                                                            src={buildFileUrl(followup.proofImagePath)}
                                                            alt="Proof of Objective Achievement"
                                                            className="w-full max-h-64 object-contain bg-background"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {followup.stopReason === 4 && followup.stopRemarks && (
                                                <div className="pl-11">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Stop Remarks</p>
                                                    <p className="text-sm bg-background/50 rounded-lg p-3 border">{followup.stopRemarks}</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Attachments */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={FileText}
                                    title="Attachments"
                                    action={
                                        followup.attachments?.length ? (
                                            <Badge variant="secondary">
                                                {followup.attachments.length} file
                                                {followup.attachments.length > 1 ? "s" : ""}
                                            </Badge>
                                        ) : null
                                    }
                                />
                            </CardHeader>
                            <CardContent>
                                {followup.attachments?.length ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {followup.attachments.map((file: string, i: number) => (
                                            <AttachmentCard key={i} url={file} index={i} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={FileText} title="No Attachments" description="No files have been attached to this follow-up." />
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Contact Persons */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={User}
                                    title="Contact Persons"
                                    action={followup.contacts?.length ? <Badge variant="secondary">{followup.contacts.length}</Badge> : null}
                                />
                            </CardHeader>
                            <CardContent>
                                {followup.contacts?.length ? (
                                    <div className="space-y-3">
                                        {followup.contacts.map((contact: any, i: number) => (
                                            <ContactCard key={i} name={contact.name} phone={contact.phone} email={contact.email} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={User} title="No Contacts" description="No contact persons have been added." />
                                )}
                            </CardContent>
                        </Card>

                        {/* Activity/Timeline Placeholder */}
                        <Card className="shadow-sm border-0 ring-1 ring-border/50">
                            <CardHeader className="pb-4">
                                <SectionHeader icon={Clock} title="Recent Activity" />
                            </CardHeader>
                            <CardContent>
                                <EmptyState icon={Clock} title="No Activity Yet" description="Activity history will appear here." />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
