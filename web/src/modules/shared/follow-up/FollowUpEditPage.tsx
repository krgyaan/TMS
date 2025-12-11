import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* ShadCN / Radix style components */
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TiptapEditor } from "@/components/tiptapeditor";
import { MockUploadDropzone } from "@/components/mock-uploadthing";
import { DatePicker } from "@/components/ui/date-picker";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { UpdateFollowUpSchema } from "@/modules/shared/follow-up/follow-up.types";
import type { UpdateFollowUpDto } from "@/modules/shared/follow-up/follow-up.types";

/* Icons */
import { ArrowLeft, Plus, Trash2, FileText, User, Calendar, Clock, Building, DollarSign, UserCheck, Target, MessageSquare } from "lucide-react";

import { useFollowUp, useUpdateFollowUp } from "./follow-up.hooks";
import { toast } from "sonner";
import { useUsers } from "@/hooks/api/useUsers";

const FREQUENCIES: Record<string, string> = {
    daily: "Daily",
    alternate: "Alternate Days",
    weekly: "Weekly",
    biweekly: "Biweekly",
    monthly: "Monthly",
    stopped: "Stop",
};

const STOP_REASONS: Record<string, string> = {
    party_angry: "The person is getting angry/or has requested to stop",
    objective_achieved: "Followup Objective achieved",
    not_reachable: "External Followup Initiated",
    other: "Remarks",
};

const FollowUpEditPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const followupId = Number(id);

    const { data: followup, isLoading } = useFollowUp(followupId);
    const updateMutation = useUpdateFollowUp();

    const { data: employees = [], isLoading: employeesLoading } = useUsers();

    /* ✅ RHF SETUP */
    const form = useForm<UpdateFollowUpDto>({
        resolver: zodResolver(UpdateFollowUpSchema),
    });

    /* ✅ NON-FORM UI STATE */
    const [persons, setPersons] = useState<Array<{ name: string; phone: string; email: string }>>([]);
    const [existingPersons, setExistingPersons] = useState<any[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]); // kept as in original, even if only used in onDropFiles

    /* ✅ HYDRATE FORM FROM API */
    useEffect(() => {
        if (!followup) return;

        setExistingPersons(followup.contacts ?? []);
        setExistingAttachments(followup.attachments ?? []);

        form.reset({
            area: followup.area,
            partyName: followup.partyName,
            amount: followup.amount,
            assignedToId: followup.assignedToId,
            details: followup.details ?? "",
            frequency: followup.frequency,
            startFrom: followup.startFrom,
            stopReason: followup.stopReason,
            proofText: followup.proofText,
            stopRemarks: followup.stopRemarks,
            attachments: followup.attachments ?? [],
            contacts: followup.contacts ?? [],
        });
    }, [followup, form]);

    /* ✅ PERSON HANDLERS (UNCHANGED UI) */
    const addPersonRow = () => setPersons(p => [...p, { name: "", phone: "", email: "" }]);

    const updatePersonRow = (idx: number, field: keyof (typeof persons)[number], value: string) => {
        setPersons(p => {
            const copy = [...p];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const removeNewPersonRow = (idx: number) => setPersons(p => p.filter((_, i) => i !== idx));

    const removeExistingPerson = (personId: number) => {
        setExistingPersons(prev => prev.filter(p => p.id !== personId));
    };

    /* ✅ FILE UPLOAD (UNCHANGED UI, kept as in original) */
    const onDropFiles = useCallback(
        (incoming: FileList | null) => {
            if (!incoming) return;
            const arr = Array.from(incoming);

            const MAX_FILES = 5;
            if (existingAttachments.length + files.length + arr.length > MAX_FILES) {
                alert(`Max ${MAX_FILES} files allowed.`);
                return;
            }

            const totalNewSize = arr.reduce((s, f) => s + f.size, 0);
            if (totalNewSize / 1024 / 1024 > 25) {
                alert("Upload size exceeds 25MB.");
                return;
            }

            setFiles(f => [...f, ...arr]);
        },
        [files, existingAttachments]
    );

    const removeExistingAttachment = (name: string) => {
        setExistingAttachments(a => a.filter(x => x !== name));
    };

    /* ✅ SUBMIT HANDLER — REAL API */
    const onSubmit = () => {
        const values = form.getValues();

        const payload: UpdateFollowUpDto = {
            ...values,
            contacts: [...existingPersons, ...persons],
            attachments: existingAttachments,
        };

        const parsed = UpdateFollowUpSchema.safeParse(payload);
        if (!parsed.success) {
            alert(parsed.error.issues[0]?.message || "Invalid form data");
            return;
        }

        updateMutation.mutate(
            { id: followupId, data: parsed.data },
            {
                onSuccess: () => {
                    toast.success("Followup updated successfully!");
                    // navigate(-1);
                },
                onError: (err: any) => {
                    toast.error(err?.message || "Failed to update followup");
                },
            }
        );
    };

    if (isLoading) return <div className="p-6">Loading...</div>;
    if (!followup) return <div className="p-6 text-red-500">Follow up details not found</div>;

    const frequency = form.watch("frequency");
    const stopReason = form.watch("stopReason");
    console.log("EMPLOYEES:", employees);

    return (
        <div className="min-h-screen bg-background py-8 px-4 md:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="h-11 w-11 rounded-xl border border-border bg-card hover:bg-accent transition-all duration-200"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-foreground">Edit Followup</h1>
                        <p className="text-sm text-muted-foreground mt-2">Update followup details and contact information</p>
                    </div>
                    <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
                        ID: #{followup.id}
                    </Badge>
                </div>

                <Card className="shadow-lg border-border/50 backdrop-blur-sm bg-card/50 p-3 ">
                    <CardHeader className=" border-b border-border">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10">
                                <MessageSquare className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-foreground">Followup Details</CardTitle>
                                <CardDescription className="text-sm text-muted-foreground mt-1">Manage followups</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-8">
                        <section className="space-y-3">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Calendar className="h-3 w-3 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Followup Information</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-3 p-2 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <Building className="h-3 w-3 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Area</Label>
                                    </div>
                                    <div className="p-2 rounded-lg border border-border bg-background/50 text-foreground font-medium text-sm">{followup.area}</div>
                                </div>

                                <div className="space-y-3 p-2 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <Building className="h-3 w-3 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Organization</Label>
                                    </div>
                                    <div className="p-2 rounded-lg border border-border bg-background/50 text-foreground font-medium text-sm">{followup.party_name}</div>
                                </div>

                                <div className="space-y-3 p-2 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Amount</Label>
                                    </div>
                                    <div className="p-2 rounded-lg border border-border bg-background/50 text-foreground font-semibold text-primary font-sm">
                                        ₹{followup.amount.toLocaleString()}
                                    </div>
                                </div>

                                <div className="space-y-3 p-2 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="h-3 w-3 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground" htmlFor="assignedto">
                                            Assigned To<span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={form.watch("assignedToId") ? String(form.watch("assignedToId")) : ""}
                                            onValueChange={value => form.setValue("assignedToId", Number(value))}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={employeesLoading ? "Loading employees..." : "Select Employee"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(employee => (
                                                    <SelectItem key={employee.id} value={String(employee.id)}>
                                                        {employee.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {/* {errors.emp_from && <p className="text-sm text-destructive">{errors.emp_from.message}</p>} */}
                                    </div>
                                    <div className="p-2 rounded-lg border border-border bg-background/50 text-foreground font-medium font-sm">
                                        {employees.find(e => e.id === form.watch("assignedToId"))?.name ?? "Not Assigned"}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3 p-2 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <Target className="h-3 w-3 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Followup For</Label>
                                    </div>
                                    <div className="p-2 rounded-lg border border-border bg-background/50 text-foreground font-sm">{followup.followup_for}</div>
                                </div>

                                <div className="space-y-3 p-2 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Next Follow-up Date</Label>
                                    </div>
                                    <DatePicker
                                        calendarClassName="min-h-[320px] shadow-xl border border-border bg-card"
                                        label="Select date"
                                        date={form.watch("startFrom")}
                                        onChange={date => form.setValue("startFrom", date)}
                                    />
                                    <small className="text-xs text-muted-foreground mt-2 block">Must be today or a future date</small>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <User className="h-3 w-3 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">Contact Details</h3>
                                </div>
                                <Button
                                    onClick={addPersonRow}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200 rounded-xl"
                                >
                                    <Plus className="h-3 w-3 mr-2" />
                                    Add Person
                                </Button>
                            </div>

                            {/* Existing Persons */}
                            {existingPersons.length > 0 && (
                                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                                    <h4 className="font-semibold text-foreground">Existing Contacts</h4>
                                    <div className="grid gap-3">
                                        {existingPersons.map(p => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-accent/50 transition-colors duration-200"
                                            >
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div>
                                                        <div className="text-sm font-medium text-foreground">{p.name}</div>
                                                        <div className="text-xs text-muted-foreground">Name</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-foreground">{p.phone}</div>
                                                        <div className="text-xs text-muted-foreground">Phone</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-foreground">{p.email}</div>
                                                        <div className="text-xs text-muted-foreground">Email</div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeExistingPerson(p.id)}
                                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 ml-4 rounded-lg"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New Persons */}
                            {persons.length > 0 && (
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                                    <h4 className="text-lg font-semibold text-foreground">New Contacts</h4>
                                    <div className="space-y-4">
                                        {persons.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2 rounded-lg border border-primary/20 bg-card">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium text-foreground">Name</Label>
                                                    <Input
                                                        placeholder="Enter name"
                                                        value={row.name}
                                                        onChange={e => updatePersonRow(idx, "name", e.target.value)}
                                                        className="border-border focus:border-primary rounded-lg"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium text-foreground">Phone</Label>
                                                    <Input
                                                        placeholder="Enter phone"
                                                        value={row.phone}
                                                        onChange={e => updatePersonRow(idx, "phone", e.target.value)}
                                                        className="border-border focus:border-primary rounded-lg"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium text-foreground">Email</Label>
                                                    <Input
                                                        placeholder="Enter email"
                                                        value={row.email}
                                                        onChange={e => updatePersonRow(idx, "email", e.target.value)}
                                                        className="border-border focus:border-primary rounded-lg"
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => removeNewPersonRow(idx)}
                                                        className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive w-full rounded-lg"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* -----------------------------
            FREQUENCY + STOP SECTION
            ------------------------------ */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Clock className="h-3 w-3 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Followup Scheduling</h3>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="space-y-3 p-3 rounded-xl border border-border bg-card/50">
                                    <Label className="text-sm font-medium text-foreground">Followup Frequency</Label>
                                    <Select value={frequency} onValueChange={val => form.setValue("frequency", val as any)}>
                                        <SelectTrigger className="border-border focus:ring-primary focus:border-primary rounded-lg w-full">
                                            <SelectValue placeholder="Choose frequency" />
                                        </SelectTrigger>
                                        <SelectContent className="border-border bg-card rounded-xl">
                                            {Object.entries(FREQUENCIES).map(([k, v]) => (
                                                <SelectItem key={k} value={k} className="focus:bg-accent rounded-lg">
                                                    {v}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {frequency === "stopped" && (
                                    <>
                                        <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                            <Label className="text-sm font-medium text-foreground">Stop Reason</Label>
                                            <Select value={stopReason} onValueChange={val => form.setValue("stopReason", val as any)}>
                                                <SelectTrigger className="border-border focus:ring-destructive focus:border-destructive rounded-lg">
                                                    <SelectValue placeholder="Select reason" />
                                                </SelectTrigger>
                                                <SelectContent className="border-border bg-card rounded-xl">
                                                    {Object.entries(STOP_REASONS).map(([k, v]) => (
                                                        <SelectItem key={k} value={k} className="focus:bg-destructive/10 rounded-lg">
                                                            {v}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                            {(stopReason === "objective_achieved" || stopReason === "other") && (
                                                <>
                                                    <Label className="text-sm font-medium text-foreground">
                                                        {stopReason === "objective_achieved" ? "Proof Details" : "Remarks"}
                                                    </Label>
                                                    <Textarea
                                                        value={stopReason === "objective_achieved" ? form.watch("proofText") || "" : form.watch("stopRemarks") || ""}
                                                        onChange={e =>
                                                            stopReason === "objective_achieved"
                                                                ? form.setValue("proofText", e.target.value as any)
                                                                : form.setValue("stopRemarks", e.target.value as any)
                                                        }
                                                        placeholder={stopReason === "objective_achieved" ? "Provide proof of objective achievement..." : "Enter remarks..."}
                                                        className="min-h-[100px] border-border focus:border-destructive rounded-lg"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* -----------------------------
                            DETAILED REQUEST / TIPTAP
                        ------------------------------ */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Detailed Request</h3>
                            </div>
                            <TiptapEditor value={form.watch("details") || ""} onChange={val => form.setValue("details", val as any)} />
                        </section>

                        {/* -----------------------------
                        ATTACHMENTS
                        ------------------------------ */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Attachments</h3>
                            </div>

                            <MockUploadDropzone
                                maxFiles={5}
                                maxSizeMB={25}
                                onClientUploadComplete={files => {
                                    const uploaded = files.map(f => f.url);
                                    setExistingAttachments(prev => [...prev, ...uploaded]);
                                }}
                            />

                            {existingAttachments.length > 0 && (
                                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                                    <h4 className="text-lg font-semibold text-foreground">Current Attachments</h4>
                                    <div className="grid gap-2">
                                        {existingAttachments.map(file => (
                                            <div key={file} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <a
                                                        className="text-sm text-foreground hover:text-primary hover:underline transition-colors"
                                                        href={file}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {file}
                                                    </a>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeExistingAttachment(file)}
                                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 rounded-lg"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* -----------------------------
            COMMENT (READONLY)
            ------------------------------ */}
                        <section className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                            <Label className="text-sm font-medium text-foreground">Previous Comment</Label>
                            <Textarea value={followup.comment ?? ""} readOnly className="bg-background/50 border-border text-foreground rounded-lg min-h-[100px] resize-none" />
                        </section>

                        {/* SUBMIT */}
                        <div className="pt-6 border-t border-border">
                            <div className="flex gap-4 justify-end">
                                <Button variant="outline" onClick={() => navigate(-1)} className="rounded-lg border-border">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={onSubmit}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-8"
                                >
                                    Update Followup
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FollowUpEditPage;
