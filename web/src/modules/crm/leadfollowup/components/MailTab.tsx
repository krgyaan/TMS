import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Clock, Calendar, Paperclip, Loader2, Send, Edit, Save, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { FileUploader } from "@/components/file-upload";
import { fileUploadService } from "@/services/api/file-upload.service";
import { format } from "date-fns";
import {useLeadFollowups, useMailForm, useStopFollowup,isToday,sourceFollowupPath, type MailFormValues} from "@/hooks/api/useLeadFollowups";
import type { BaseFollowup, FollowupSource } from "../helpers/leadfollowup.types";

const FREQUENCY_OPTIONS = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "custom", label: "Custom" },
];

interface MailTabProps {
    source: FollowupSource;
    mode?: "create" | "view";
    initialAttachments?: string[];
}

export function MailTab({ source, mode = "create", initialAttachments }: MailTabProps) {
    if (mode === "view") {
        return <MailFollowupList source={source} />;
    }
    return <MailCreateForm source={source} initialAttachments={initialAttachments} />;
}

// ─── Create / Edit Form ───────────────────────────────────────────────────────

function MailCreateForm({ source, initialAttachments }: { source: FollowupSource; initialAttachments?: string[] }) {
    const {
        form,
        attachmentPaths,
        setAttachmentPaths,
        isEditMode,
        saving,
        handleSubmit,
        handleCancelEdit,
    } = useMailForm(source);

    useEffect(() => {
        if (!isEditMode && initialAttachments && initialAttachments.length > 0) {
            setAttachmentPaths((prev) =>
                prev.length === 0 ? [...new Set([...prev, ...initialAttachments])] : prev
            );
        }
    }, [initialAttachments, isEditMode, setAttachmentPaths]);

    return (
        <Form {...form}>
            {isEditMode && (
                <div className="flex items-center justify-between p-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
                    <p className="text-sm text-amber-800 font-medium dark:text-amber-400">
                        ✏️ Editing existing mail follow-up
                    </p>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={saving}
                    >
                        <X className="h-3 w-3 mr-1" />
                        Cancel Edit
                    </Button>
                </div>
            )}

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FieldWrapper<MailFormValues, "subject">
                    control={form.control}
                    name="subject"
                    label="Subject"
                >
                    {(field) => (
                        <Input
                            type="text"
                            placeholder="Enter mail subject"
                            disabled={saving}
                            {...field}
                            value={field.value ?? ""}
                        />
                    )}
                </FieldWrapper>

                <FieldWrapper<MailFormValues, "body">
                    control={form.control}
                    name="body"
                    label="Mail Body"
                >
                    {(field) => (
                        <textarea
                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[200px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Dear Sir/Madam,

Write your mail body here..."
                            disabled={saving}
                            {...field}
                        />
                    )}
                </FieldWrapper>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField<MailFormValues, "frequency">
                        control={form.control}
                        name="frequency"
                        label="Frequency"
                        options={FREQUENCY_OPTIONS}
                        placeholder="Select Frequency"
                    />

                    <FieldWrapper<MailFormValues, "nextFollowupDate">
                        control={form.control}
                        name="nextFollowupDate"
                        label="Next Follow-up Date"
                    >
                        {(field) => (
                            <input
                                type="date"
                                className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                disabled={saving}
                                {...field}
                                value={field.value ?? ""}
                            />
                        )}
                    </FieldWrapper>
                </div>

                <div className="space-y-2">
                    <FileUploader
                        context="lead-followups"
                        value={attachmentPaths}
                        onChange={setAttachmentPaths}
                        label="Attachments"
                        disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">
                        Upload relevant documents (optional)
                    </p>
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : isEditMode ? (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Update Mail Follow-up
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Save Mail Follow-up
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

// ─── List View ────────────────────────────────────────────────────────────────

function MailFollowupList({ source }: { source: FollowupSource }) {
    const { data: allFollowups = [] } = useLeadFollowups(source);

    const mailFollowups = useMemo(
        () =>
            allFollowups
                .filter((f) => f.type === "mail")
                .sort(
                    (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                ),
        [allFollowups]
    );

    if (mailFollowups.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No mail follow-ups yet
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {mailFollowups.map((followup) => (
                <MailFollowupCard
                    key={followup.id}
                    followup={followup}
                    source={source}
                />
            ))}
        </div>
    );
}

// ─── Followup Card ────────────────────────────────────────────────────────────

function MailFollowupCard({
    followup,
    source,
}: {
    followup: BaseFollowup;
    source: FollowupSource;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const stopFollowup = useStopFollowup(source);
    const isStopped = followup.status === "stopped";

    const handleStop = async () => {
        await stopFollowup.mutateAsync(followup.id);
    };

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="border rounded-lg"
        >
            <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-left">
                            <p className="font-medium">
                                {format(new Date(followup.createdAt), "PPp")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                by {followup.createdByName || "Unknown"}
                            </p>
                        </div>
                        {isToday(followup.createdAt) && (
                            <Badge className="bg-green-500">Today</Badge>
                        )}
                        {isStopped && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700">Stopped</Badge>
                        )}
                    </div>
                    {isOpen ? (
                        <ChevronUp className="h-5 w-5" />
                    ) : (
                        <ChevronDown className="h-5 w-5" />
                    )}
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <Card className="border-0 shadow-none rounded-none">
                    <CardContent className="pt-4 px-4">
                        <Table>
                            <TableBody>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        <Mail className="h-4 w-4 inline mr-2" />
                                        Mail Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            Subject
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold w-1/4">
                                        {followup.subject || "—"}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Frequency
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm w-1/4">
                                        {followup.frequency ? (
                                            <Badge variant="outline" className="capitalize">
                                                {followup.frequency}
                                            </Badge>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Next Follow-up Date
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {followup.nextFollowupDate
                                            ? format(new Date(followup.nextFollowupDate), "PP")
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Paperclip className="h-4 w-4" />
                                            Attachments
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {followup.attachments && followup.attachments.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {followup.attachments.map((path, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={fileUploadService.getFileUrl(path)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        {path.split("/").pop()}
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                </TableRow>

                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Mail Content
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Mail Body
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-pre-wrap" colSpan={3}>
                                        {followup.body || "—"}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="flex items-center gap-2 px-4 pb-4">
                    {!isStopped && (
                        <Button
                            size="sm"
                            onClick={() =>
                                navigate(
                                    `${sourceFollowupPath(source)}?tab=mail&followupId=${followup.id}`
                                )
                            }
                        >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                        </Button>
                    )}
                    {!isStopped && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={handleStop}
                            disabled={stopFollowup.isPending}
                        >
                            {stopFollowup.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                            Stop
                        </Button>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}