import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapPin, MessageSquare, ClipboardList, Calendar, User, Loader2, Edit, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { ContactPersonFields } from "./ContactPersonFields";
import { format } from "date-fns";
import { 
    useLeadFollowups, 
    useVisitForm, 
    isToday,
    sourceFollowupPath,
    type VisitFormValues 
} from "@/hooks/api/useLeadFollowups";
import type { BaseFollowup, FollowupSource } from "../helpers/leadfollowup.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface VisitTabProps {
    source: FollowupSource;
    mode?: 'create' | 'view';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VisitTab({ source, mode = 'create' }: VisitTabProps) {
    if (mode === 'view') {
        return <VisitFollowupList source={source} />;
    }
    return <VisitCreateForm source={source} />;
}

// ─── Create / Edit Form ───────────────────────────────────────────────────────

function VisitCreateForm({ source }: { source: FollowupSource }) {
    const {
        form,
        contacts,
        setContacts,
        lockedCount,
        isEditMode,
        saving,
        handleSubmit,
        handleCancelEdit,
    } = useVisitForm(source);

    return (
        <Form {...form}>
            {isEditMode && (
                <div className="flex items-center justify-between p-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
                    <p className="text-sm text-amber-800 font-medium dark:text-amber-400">
                        ✏️ Editing existing visit follow-up
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
                <FieldWrapper<VisitFormValues, "body">
                    control={form.control}
                    name="body"
                    label="Points Discussed"
                >
                    {(field) => (
                        <textarea
                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[150px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Enter points discussed during the visit..."
                            disabled={saving}
                            {...field}
                        />
                    )}
                </FieldWrapper>

                <FieldWrapper<VisitFormValues, "veResponsibility">
                    control={form.control}
                    name="veResponsibility"
                    label="VE Responsibility"
                >
                    {(field) => (
                        <textarea
                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Enter VE responsibilities..."
                            disabled={saving}
                            {...field}
                            value={field.value ?? ""}
                        />
                    )}
                </FieldWrapper>

                <ContactPersonFields
                    contacts={contacts}
                    onChange={setContacts}
                    disabled={saving}
                    lockedCount={lockedCount}
                />

                <div className="w-64">
                    <FieldWrapper<VisitFormValues, "nextFollowupDate">
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
                                Update Visit Follow-up
                            </>
                        ) : (
                            <>
                                <MapPin className="mr-2 h-4 w-4" />
                                Save Visit Follow-up
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

// ─── List View ────────────────────────────────────────────────────────────────

function VisitFollowupList({ source }: { source: FollowupSource }) {
    const { data: allFollowups = [] } = useLeadFollowups(source);

    const visitFollowups = useMemo(
        () => allFollowups
            .filter(f => f.type === 'visit')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [allFollowups]
    );

    if (visitFollowups.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No visit follow-ups yet
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {visitFollowups.map(followup => (
                <VisitFollowupCard key={followup.id} followup={followup} source={source} />
            ))}
        </div>
    );
}

// ─── Followup Card ────────────────────────────────────────────────────────────

function VisitFollowupCard({ followup, source }: { followup: BaseFollowup; source: FollowupSource }) {
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

<CollapsibleContent>
                <Card className="border-0 shadow-none rounded-none">
                    <CardContent className="pt-4 px-4">
                        <Table>
                            <TableBody>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        <MapPin className="h-4 w-4 inline mr-2" />
                                        Visit Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            Points Discussed
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-pre-wrap w-1/4">
                                        {followup.body || "—"}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Next Follow-up Date
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm w-1/4">
                                        {followup.nextFollowupDate
                                            ? format(new Date(followup.nextFollowupDate), "PP")
                                            : "—"}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="h-4 w-4" />
                                            VE Responsibility
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-pre-wrap" colSpan={3}>
                                        {followup.veResponsibility || "—"}
                                    </TableCell>
                                </TableRow>

                                {followup.contacts && followup.contacts.length > 0 && (
                                    <>
                                        <TableRow className="bg-muted/50">
                                            <TableCell colSpan={4} className="font-semibold text-sm">
                                                <User className="h-4 w-4 inline mr-2" />
                                                Contacts
                                            </TableCell>
                                        </TableRow>
                                        {followup.contacts.map((contact, idx) => (
                                            <React.Fragment key={idx}>
                                                <TableRow className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4" />
                                                            {idx === 0 ? "Primary Contact" : `Contact ${idx + 1}`}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm font-semibold w-1/4">
                                                        {contact.name}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                                        Phone
                                                    </TableCell>
                                                    <TableCell className="text-sm w-1/4">
                                                        {contact.phone || "—"}
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                                        Designation
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {contact.designation || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                                        Email
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {contact.email || "—"}
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        ))}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {isToday(followup.createdAt) && (
                    <div className="px-4 pb-4">
                        <Button
                            size="sm"
                            onClick={() =>
                                navigate(
                                    `${sourceFollowupPath(source)}?tab=visit&followupId=${followup.id}`
                                )
                            }
                        >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                        </Button>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}