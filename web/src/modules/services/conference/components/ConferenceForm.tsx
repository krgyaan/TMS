import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Save, Loader2, FileText, Mic, Image } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { TenderFileUploader } from "@/components/tender-file-upload/TenderFileUploader";
import { paths } from "@/app/routes/paths";
import { useConference, useCreateConference, useUpdateConference } from "@/hooks/api/useConference";
import {
    ConferenceFormSchema,
    conferenceFormDefaultValues,
    conferenceAttachmentUrl,
    type ConferenceFormValues,
    type CreateConferenceCallReportDto,
    type ConferenceAttachment,
} from "../helpers/conference.types";

const inputCls =
    "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent " +
    "px-3 py-1 text-sm outline-none focus-visible:border-ring " +
    "focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const sectionCls = "py-6 px-6 border-b last:border-b-0";

interface ConferenceFormProps {
    complaintId?: number;
    conferenceId?: number;
}

export function ConferenceForm({ complaintId, conferenceId }: ConferenceFormProps) {
    const navigate = useNavigate();
    const isEdit = !!conferenceId;

    const createConference = useCreateConference();
    const updateConference = useUpdateConference();
    const { data: conference } = useConference(conferenceId ?? 0);

    const [attachmentPaths, setAttachmentPaths] = useState<ConferenceAttachment[]>([]);
    const [voiceRecordingPath, setVoiceRecordingPath] = useState<string>("");

    const form = useForm<ConferenceFormValues>({
        resolver: zodResolver(ConferenceFormSchema) as Resolver<ConferenceFormValues>,
        defaultValues: conferenceFormDefaultValues,
    });

    useEffect(() => {
        if (!isEdit || !conference) return;
        form.reset({
            issueDescription: conference.issueDescription,
            materialsRequired: conference.materialsRequired ?? "",
            actionsPlanned: conference.actionsPlanned ?? "",
            voiceRecordingPath: conference.voiceRecordingPath ?? "",
        });
        if (conference.attachments && conference.attachments.length > 0) {
            setAttachmentPaths(conference.attachments);
        }
        if (conference.voiceRecordingPath) {
            setVoiceRecordingPath(conference.voiceRecordingPath);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, conference]);

    const saving = createConference.isPending || updateConference.isPending;

    const onSubmit = async (values: ConferenceFormValues) => {
        if (!complaintId) return;

        const payload: CreateConferenceCallReportDto = {
            complaintId,
            issueDescription: values.issueDescription,
            materialsRequired: values.materialsRequired?.trim() ? values.materialsRequired : null,
            actionsPlanned: values.actionsPlanned?.trim() ? values.actionsPlanned : null,
            voiceRecordingPath: voiceRecordingPath || values.voiceRecordingPath || null,
            attachments: attachmentPaths.length > 0 ? attachmentPaths : [],
        };

        try {
            if (isEdit && conferenceId) {
                await updateConference.mutateAsync({ id: conferenceId, data: payload });
            } else {
                await createConference.mutateAsync(payload);
            }
            navigate(paths.services.conference);
        } catch {
            // handled by hooks
        }
    };

    const handleVoiceRecordingChange = (paths: string[]) => {
        setVoiceRecordingPath(paths[0] ?? "");
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b bg-muted/30">
                        <h2 className="text-base font-semibold">{isEdit ? "Edit Conference Call Report" : "Create Conference Call Report"}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Fill in the conference call details and save.</p>
                    </div>

                    {/* Issue Description */}
                    <div className={sectionCls}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Issue Description in detail</p>
                        <FieldWrapper<ConferenceFormValues, "issueDescription"> control={form.control} name="issueDescription" label="Issue Description *">
                            {field => (
                                <Textarea
                                    className={inputCls + " min-h-[120px]"}
                                    placeholder="Describe the issue discussed in the conference call..."
                                    disabled={saving}
                                    {...field}
                                />
                            )}
                        </FieldWrapper>
                    </div>

                    {/* Materials/Tools Required */}
                    <div className={sectionCls}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Material/Tools required for resolution</p>
                        <FieldWrapper<ConferenceFormValues, "materialsRequired"> control={form.control} name="materialsRequired" label="Materials/Tools Required">
                            {field => (
                                <Textarea className={inputCls + " min-h-[100px]"} placeholder="List materials and tools required for resolution..." disabled={saving} {...field} />
                            )}
                        </FieldWrapper>
                    </div>

                    {/* Actions Planned */}
                    <div className={sectionCls}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Actions planned for resolution</p>
                        <FieldWrapper<ConferenceFormValues, "actionsPlanned"> control={form.control} name="actionsPlanned" label="Actions Planned">
                            {field => <Textarea className={inputCls + " min-h-[100px]"} placeholder="List actions planned for resolution..." disabled={saving} {...field} />}
                        </FieldWrapper>
                    </div>

                    {/* Additional Photos/Videos */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <Image className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional Photos/Videos</p>
                        </div>
                        <TenderFileUploader
                            context="customer-attachments"
                            value={attachmentPaths.map(p => p.path)}
                            onChange={paths => setAttachmentPaths(paths.map(p => ({ path: p })))}
                            disabled={saving}
                            label="Upload additional photos or videos"
                        />
                        {attachmentPaths.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {attachmentPaths.map((att, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded">
                                        <FileText className="h-3 w-3" />
                                        {att.name || att.path.split("/").pop() || `Attachment ${idx + 1}`}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Phone Voice Recording */}
                    <div className={sectionCls}>
                        <div className="flex items-center gap-2 mb-3">
                            <Mic className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Voice Recording</p>
                        </div>
                        <TenderFileUploader
                            context="customer-attachments"
                            value={voiceRecordingPath ? [voiceRecordingPath] : []}
                            onChange={handleVoiceRecordingChange}
                            disabled={saving}
                            label="Upload voice recording (audio file)"
                        />
                        {voiceRecordingPath && (
                            <div className="mt-3">
                                <audio controls className="w-full" src={conferenceAttachmentUrl(voiceRecordingPath)} />
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => navigate(paths.services.conference)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isEdit ? "Update Report" : "Save Report"}
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </form>
        </Form>
    );
}
