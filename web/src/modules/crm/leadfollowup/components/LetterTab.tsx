import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Loader2, FileText, Edit, Save, X, ChevronDown, ChevronUp, Mail, User, MapPin, Phone, Briefcase, Eye, Calendar, Package, Building2 } from "lucide-react";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { FileUploader } from "@/components/file-upload";
import { fileUploadService } from "@/services/api/file-upload.service";
import { useUsers } from "@/hooks/api/useUsers";
import { format } from "date-fns";
import {
    useLeadFollowups,
    useLetterForm,
    isToday,
    sourceFollowupPath,
    type LetterFormValues
} from "@/hooks/api/useLeadFollowups";
import type { BaseFollowup, FollowupSource } from "../helpers/leadfollowup.types";

const docUrl = (doc: string): string =>
    doc.includes("/") ? fileUploadService.getFileUrl(doc) : `/uploads/courier/${doc}`;

const URGENCY_OPTIONS = [
    { value: '1', label: 'Very Low' },
    { value: '2', label: 'Low' },
    { value: '3', label: 'Normal' },
    { value: '4', label: 'High' },
    { value: '5', label: 'Urgent' },
];

interface LetterTabProps {
    source: FollowupSource;
    mode?: 'create' | 'view';
}

export function LetterTab({ source, mode = 'create' }: LetterTabProps) {
    if (mode === 'view') {
        return <LetterFollowupList source={source} />;
    }
    return <LetterCreateForm source={source} />;
}

// ─── Create / Edit Form ───────────────────────────────────────────────────────

function LetterCreateForm({ source }: { source: FollowupSource }) {
    const {
        form,
        attachmentPaths,
        setAttachmentPaths,
        isEditMode,
        saving,
        handleSubmit,
        handleCancelEdit,
    } = useLetterForm(source);

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
                        <FileUploader
                            context="lead-followups"
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

function LetterFollowupList({ source }: { source: FollowupSource }) {
    const { data: allFollowups = [] } = useLeadFollowups(source);

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
                <LetterFollowupCard key={followup.id} followup={followup} source={source} />
            ))}
        </div>
    );
}

// ─── Followup Card ────────────────────────────────────────────────────────────

function LetterFollowupCard({ followup, source }: { followup: BaseFollowup; source: FollowupSource }) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { data: allUsers = [] } = useUsers();

    const courier = followup.courier;
    const senderName = allUsers.find(u => String(u.id) === String(courier?.empFrom))?.name || null;
    const urgencyLabel = courier?.urgency != null
        ? (URGENCY_OPTIONS.find(o => o.value === String(courier.urgency))?.label ?? String(courier.urgency))
        : null;
    const courierDocs = courier?.courierDocs?.filter(Boolean) ?? [];

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

            <CollapsibleContent>
                <Card className="border-0 shadow-none rounded-none">
                    <CardContent className="pt-4 px-4">
                        <Table>
                            <TableBody>
                                {courier ? (
                                    <>
                                        <TableRow className="bg-muted/50">
                                            <TableCell colSpan={4} className="font-semibold text-sm">
                                                <Briefcase className="h-4 w-4 inline mr-2" /> Courier Details
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4" />
                                                    Courier ID
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{courier.id ?? followup.courierId ?? "—"}</TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4" />
                                                    Organization Name
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{courier.toOrg || "—"}</TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    Person Name
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{courier.toName || "—"}</TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" />
                                                    Address
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{courier.toAddr || "—"}</TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Pin Code
                                            </TableCell>
                                            <TableCell className="text-sm">{courier.toPin || "—"}</TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4" />
                                                    Mobile Number
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{courier.toMobile || "—"}</TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4" />
                                                    Courier From
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{senderName || "—"}</TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Expected Delivery Date
                                            </TableCell>
                                            <TableCell className="text-sm">{courier.delDate ? format(new Date(courier.delDate), "PP") : "—"}</TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Dispatch Urgency
                                            </TableCell>
                                            <TableCell className="text-sm">{urgencyLabel ? <Badge variant="outline">{urgencyLabel}</Badge> : "—"}</TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Documents
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {courierDocs.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {courierDocs.map((doc, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={docUrl(doc)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                                {doc.split('/').pop()}
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : "—"}
                                            </TableCell>
                                        </TableRow>
                                    </>
                                ) : (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                Courier ID
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {followup.courierId || "—"}
                                        </TableCell>
                                    </TableRow>
                                )}

                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        <Calendar className="h-4 w-4 inline mr-2" /> Follow-up
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Next Follow-up Date
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        {followup.nextFollowupDate
                                            ? format(new Date(followup.nextFollowupDate), "PP")
                                            : "—"}
                                    </TableCell>
                                </TableRow>
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
                                    `${sourceFollowupPath(source)}?tab=letter&followupId=${followup.id}`
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