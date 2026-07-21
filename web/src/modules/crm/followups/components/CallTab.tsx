import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Phone, Edit, Save, X, ChevronDown, ChevronUp, User } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { ContactPersonFields } from "./ContactPersonFields";
import { format } from "date-fns";
import { paths } from "@/app/routes/paths";
import {
    useFollowups,
    useCallForm,
    isToday,
    type CallFormValues
} from "@/hooks/api/useFollowups";
import type { BaseFollowup } from "../helpers/followup.types";

interface CallTabProps {
    leadId: number;
    mode?: 'create' | 'view';
}

export function CallTab({ leadId, mode = 'create' }: CallTabProps) {
    if (mode === 'view') {
        return <CallFollowupList leadId={leadId} />;
    }
    return <CallCreateForm leadId={leadId} />;
}

// ─── Create / Edit Form ───────────────────────────────────────────────────────

function CallCreateForm({ leadId }: { leadId: number }) {
    const {
        form,
        contacts,
        setContacts,
        lockedCount,
        isEditMode,
        saving,
        handleSubmit,
        handleCancelEdit,
    } = useCallForm(leadId);

    return (
        <Form {...form}>
            {isEditMode && (
                <div className="flex items-center justify-between p-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
                    <p className="text-sm text-amber-800 font-medium dark:text-amber-400">
                        ✏️ Editing existing call follow-up
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldWrapper<CallFormValues, "body">
                        control={form.control}
                        name="body"
                        label="Points Discussed"
                    >
                        {(field) => (
                            <textarea
                                className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[150px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                placeholder="Enter points discussed during the call..."
                                disabled={saving}
                                {...field}
                            />
                        )}
                    </FieldWrapper>

                    <FieldWrapper<CallFormValues, "veResponsibility">
                        control={form.control}
                        name="veResponsibility"
                        label="VE Responsibility"
                    >
                        {(field) => (
                            <textarea
                                className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[150px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                placeholder="Enter VE responsibilities..."
                                disabled={saving}
                                {...field}
                                value={field.value ?? ""}
                            />
                        )}
                    </FieldWrapper>
                </div>

                <ContactPersonFields
                    contacts={contacts}
                    onChange={setContacts}
                    disabled={saving}
                    lockedCount={lockedCount}
                />

                <div className="w-64">
                    <FieldWrapper<CallFormValues, "nextFollowupDate">
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
                                Update Call Follow-up
                            </>
                        ) : (
                            <>
                                <Phone className="mr-2 h-4 w-4" />
                                Save Call Follow-up
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

// ─── List View ────────────────────────────────────────────────────────────────

function CallFollowupList({ leadId }: { leadId: number }) {
    const { data: allFollowups = [] } = useFollowups(leadId);

    const callFollowups = useMemo(
        () => allFollowups
            .filter(f => f.type === 'call')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [allFollowups]
    );

    if (callFollowups.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No call follow-ups yet
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {callFollowups.map(followup => (
                <CallFollowupCard key={followup.id} followup={followup} leadId={leadId} />
            ))}
        </div>
    );
}

// ─── Followup Card ────────────────────────────────────────────────────────────

function CallFollowupCard({ followup, leadId }: { followup: BaseFollowup; leadId: number }) {
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
                    {isOpen
                        ? <ChevronUp className="h-5 w-5" />
                        : <ChevronDown className="h-5 w-5" />
                    }
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="p-4 pt-0 space-y-4">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                        Points Discussed
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                        {followup.body || "—"}
                    </p>
                </div>

                {followup.veResponsibility && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                            VE Responsibility
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                            {followup.veResponsibility}
                        </p>
                    </div>
                )}

                {followup.contacts && followup.contacts.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                            Contacts
                        </p>
                        <div className="space-y-2">
                            {followup.contacts.map((contact, idx) => (
                                <div
                                    key={idx}
                                    className="border rounded-lg p-3 bg-muted/30"
                                >
                                    <div className="flex items-start gap-2">
                                        <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                        <div className="space-y-0.5">
                                            <p className="font-medium text-sm">
                                                {contact.name}
                                            </p>
                                            {contact.designation && (
                                                <p className="text-xs text-muted-foreground">
                                                    {contact.designation}
                                                </p>
                                            )}
                                            {contact.phone && (
                                                <p className="text-xs">
                                                    📞 {contact.phone}
                                                </p>
                                            )}
                                            {contact.email && (
                                                <p className="text-xs text-blue-500">
                                                    ✉️ {contact.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {followup.nextFollowupDate && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                            Next Follow-up Date
                        </p>
                        <p className="text-sm">
                            {format(new Date(followup.nextFollowupDate), 'PP')}
                        </p>
                    </div>
                )}

                {isToday(followup.createdAt) && (
                    <Button
                        size="sm"
                        onClick={() =>
                            navigate(
                                `${paths.crm.leadFollowup(leadId)}?tab=call&followupId=${followup.id}`
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