import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, FileText, Edit, Save, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useUsers } from "@/hooks/api/useUsers";
import { tenderFilesService } from "@/services/api/tender-files.service";
import { format } from "date-fns";
import { paths } from "@/app/routes/paths";
import {
    useFollowups,
    useLetterForm,
    isToday,
    type LetterFormValues
} from "@/hooks/api/useFollowups";
import type { BaseFollowup } from "../helpers/followup.types";

const URGENCY_OPTIONS = [
    { value: '1', label: 'Very Low' },
    { value: '2', label: 'Low' },
    { value: '3', label: 'Normal' },
    { value: '4', label: 'High' },
    { value: '5', label: 'Urgent' },
];

interface LetterTabProps {
    leadId: number;
    mode?: 'create' | 'view';
}

export function LetterTab({ leadId, mode = 'create' }: LetterTabProps) {
    if (mode === 'view') {
        return <LetterFollowupList leadId={leadId} />;
    }
    return <LetterCreateForm leadId={leadId} />;
}

// ─── Create / Edit Form ───────────────────────────────────────────────────────

function LetterCreateForm({ leadId }: { leadId: number }) {
    const {
        form,
        attachmentPaths,
        setAttachmentPaths,
        isEditMode,
        saving,
        handleSubmit,
        handleCancelEdit,
    } = useLetterForm(leadId);

    const { data: allUsers = [] } = useUsers();
    const employeeOptions = allUsers.map(u => ({
        value: u.id.toString(),
        label: u.team?.name ? `${u.name} (${u.team.name})` : (u.name ?? ""),
    }));

    return (
        <Form {...form}>
            {isEditMode && (
                <div className="flex items-center justify-between p-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
                    <p className="text-sm text-amber-800 font-medium dark:text-amber-400">
                        ✏️ Editing existing letter follow-up
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWrapper<LetterFormValues, "toOrg"> control={form.control} name="toOrg" label="Organization Name">
                        {(field) => <Input placeholder="Enter organization name" disabled={saving} {...field} />}
                    </FieldWrapper>

                    <FieldWrapper<LetterFormValues, "toName"> control={form.control} name="toName" label="Name">
                        {(field) => <Input placeholder="Enter recipient name" disabled={saving} {...field} />}
                    </FieldWrapper>

                    <div className="col-span-full">
                        <FieldWrapper<LetterFormValues, "toAddr"> control={form.control} name="toAddr" label="Address">
                            {(field) => (
                                <textarea
                                    className="border-input placeholder:text-muted-foreground dark:bg-input/30 h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    placeholder="Enter full address"
                                    disabled={saving}
                                    {...field}
                                />
                            )}
                        </FieldWrapper>
                    </div>

                    <FieldWrapper<LetterFormValues, "toPin"> control={form.control} name="toPin" label="Pin Code">
                        {(field) => <Input placeholder="Enter pin code" disabled={saving} {...field} />}
                    </FieldWrapper>

                    <FieldWrapper<LetterFormValues, "toMobile"> control={form.control} name="toMobile" label="Mobile Number">
                        {(field) => <Input type="tel" placeholder="Enter mobile number" disabled={saving} {...field} />}
                    </FieldWrapper>

                    <SelectField<LetterFormValues, "empFrom">
                        control={form.control}
                        name="empFrom"
                        label="Courier From"
                        options={employeeOptions}
                        placeholder="Select Employee"
                    />

                    <FieldWrapper<LetterFormValues, "delDate"> control={form.control} name="delDate" label="Expected Delivery Date">
                        {(field) => (
                            <input
                                type="date"
                                className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                disabled={saving}
                                {...field}
                            />
                        )}
                    </FieldWrapper>

                    <SelectField<LetterFormValues, "urgency">
                        control={form.control}
                        name="urgency"
                        label="Dispatch Urgency"
                        options={URGENCY_OPTIONS}
                        placeholder="Select Urgency"
                    />

                    <FieldWrapper<LetterFormValues, "nextFollowupDate"> control={form.control} name="nextFollowupDate" label="Next Follow-up Date">
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

                    <div className="col-span-full">
                        <TenderFileUploader
                            context="followups"
                            value={attachmentPaths}
                            onChange={setAttachmentPaths}
                            label="Soft Copy of Documents"
                            disabled={saving}
                        />
                    </div>
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
                                Update Letter Follow-up
                            </>
                        ) : (
                            <>
                                <FileText className="mr-2 h-4 w-4" />
                                Save Letter Follow-up
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

// ─── List View ────────────────────────────────────────────────────────────────

function LetterFollowupList({ leadId }: { leadId: number }) {
    const { data: allFollowups = [] } = useFollowups(leadId);

    const letterFollowups = useMemo(
        () => allFollowups
            .filter(f => f.type === 'letter')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [allFollowups]
    );

    if (letterFollowups.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No letter follow-ups yet
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {letterFollowups.map(followup => (
                <LetterFollowupCard key={followup.id} followup={followup} leadId={leadId} />
            ))}
        </div>
    );
}

// ─── Followup Card ────────────────────────────────────────────────────────────

function LetterFollowupCard({ followup, leadId }: { followup: BaseFollowup; leadId: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
            <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-left">
                            <p className="font-medium">
                                {format(new Date(followup.createdAt), 'PPp')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                by {followup.createdByName || "Unknown"}
                            </p>
                        </div>
                        {isToday(followup.createdAt) && (
                            <Badge className="bg-green-500">Today</Badge>
                        )}
                    </div>
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="p-4 pt-0 space-y-4">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Courier ID</p>
                    <p className="text-sm">{followup.courierId || "—"}</p>
                </div>

                {followup.attachments && followup.attachments.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Attachments</p>
                        <div className="space-y-2">
                            {followup.attachments.map((path, idx) => (
                                <a
                                    key={idx}
                                    href={tenderFilesService.getFileUrl(path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    {path.split('/').pop()}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {followup.nextFollowupDate && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Next Follow-up Date</p>
                        <p className="text-sm">{format(new Date(followup.nextFollowupDate), 'PP')}</p>
                    </div>
                )}

                {isToday(followup.createdAt) && (
                    <Button
                        size="sm"
                        onClick={() =>
                            navigate(
                                `${paths.crm.leadFollowup(leadId)}?tab=letter&followupId=${followup.id}`
                            )
                        }
                    >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                    </Button>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}