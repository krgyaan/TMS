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
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { UpdateFollowUpSchema } from "@/modules/shared/follow-up/follow-up.types";
import type { UpdateFollowUpDto } from "@/modules/shared/follow-up/follow-up.types";

/* Icons */
import { ArrowLeft, Plus, Trash2, FileText, User, Calendar, Clock, Building, DollarSign, UserCheck, Target, MessageSquare } from "lucide-react";

import { useFollowUp, useUpdateFollowUp } from "./follow-up.hooks";
import { toast } from "sonner";
import { useUsers } from "@/hooks/api/useUsers";
import { paths } from "@/app/routes/paths";
import { FileUploadField } from "@/components/form/FileUploadField";

export const FREQUENCY_LABELS: Record<number, string> = {
    1: "Daily",
    2: "Alternate Days",
    3: "Weekly",
    4: "Bi-Weekly",
    5: "Monthly",
    6: "Stopped",
};

export const STOP_REASON_LABELS: Record<number, string> = {
    1: "Party Angry / Not Interested",
    2: "Objective Achieved",
    3: "Not Reachable",
    4: "Other",
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
        defaultValues: {
            frequency: undefined,
            stopReason: undefined,
        },
    });

    /* ✅ NON-FORM UI STATE */
    const [persons, setPersons] = useState<Array<{ name: string; phone: string; email: string }>>([]);
    const [existingPersons, setExistingPersons] = useState<any[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
    const [removedAttachments, setRemovedAttachments] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);

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

    /* ✅ PERSON HANDLERS */
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

    const handleFiles = (items: any[]) => {
        setNewFiles(items.map(i => i.file).filter(Boolean));
    };

    /* ✅ SUBMIT HANDLER */
    const onSubmit = () => {
        const values = form.getValues();

        const formData = new FormData();

        // 1️⃣ Append scalar fields
        Object.entries(values).forEach(([key, value]) => {
            if (key === "contacts" || key === "attachments") return;
            if (value === undefined || value === null) return;

            if (typeof value === "object") {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        });

        // 2️⃣ Contacts (existing + new)
        formData.append("contacts", JSON.stringify([...existingPersons, ...persons]));

        // 3️⃣ Removed attachments
        removedAttachments.forEach(file => formData.append("removedAttachments[]", file));

        // 4️⃣ New files
        newFiles.forEach(file => formData.append("attachments", file));

        updateMutation.mutateAsync(
            { id: followupId, data: formData },
            {
                onSuccess: () => {
                    toast.success("Followup updated successfully!");
                    navigate(paths.shared.followUp);
                },
                onError: (err: any) => {
                    toast.error(err?.message || "Failed to update followup");
                },
            }
        );
    };

    const frequency = form.watch("frequency");
    const stopReason = form.watch("stopReason");

    useEffect(() => {
        if (frequency !== 6) {
            form.setValue("stopReason", null);
            form.setValue("proofText", null);
            form.setValue("stopRemarks", null);
        }
    }, [frequency, form]);

    if (isLoading) return <div className="p-6">Loading...</div>;
    if (!followup) return <div className="p-6 text-red-500">Follow up details not found</div>;

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-semibold">Edit Followup</h1>
                        <p className="text-muted-foreground">Update followup details and contact information</p>
                    </div>
                    <Badge variant="secondary" className="px-3 py-1">
                        ID: #{followup.id}
                    </Badge>
                </div>

                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle>Followup Details</CardTitle>
                        <CardDescription>Manage followup information</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Followup Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                Followup Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Area</Label>
                                    <div className="p-2 border rounded-md bg-muted/50">{followup.area ?? "-"}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Organization</Label>
                                    <div className="p-2 border rounded-md bg-muted/50">{followup?.partyName ?? "-"}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <div className="p-2 border rounded-md bg-muted/50 font-semibold">₹{followup.amount?.toLocaleString() ?? "-"}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="assignedto">Assigned To</Label>

                                    <Select
                                        value={form.watch("assignedToId") ? String(form.watch("assignedToId")) : undefined}
                                        onValueChange={value => form.setValue("assignedToId", Number(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={employeesLoading ? "Loading..." : "Select Employee"} />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {employees.map(employee => (
                                                <SelectItem key={employee.id} value={String(employee.id)}>
                                                    {employee.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Followup For</Label>
                                    <div className="p-2 border rounded-md bg-muted/50">{followup.followupFor ?? "-"}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Next Follow-up Date</Label>
                                    <DatePicker
                                        date={form.watch("startFrom") ? new Date(form.watch("startFrom")!) : undefined}
                                        onChange={date => form.setValue("startFrom", date ? date.toISOString().slice(0, 10) : undefined)}
                                    />

                                    <p className="text-xs text-muted-foreground">Must be today or a future date</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Details */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Contact Details
                                </h3>
                                <Button onClick={addPersonRow} size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Person
                                </Button>
                            </div>

                            {/* Existing Persons */}
                            {existingPersons.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium">Existing Contacts</h4>
                                    <div className="space-y-2">
                                        {existingPersons.map(p => (
                                            <div key={p.id} className="flex items-center justify-between p-3 border rounded-md">
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <div className="font-medium">{p.name}</div>
                                                        <div className="text-xs text-muted-foreground">Name</div>
                                                    </div>
                                                    <div>
                                                        <div>{p.phone}</div>
                                                        <div className="text-xs text-muted-foreground">Phone</div>
                                                    </div>
                                                    <div>
                                                        <div>{p.email}</div>
                                                        <div className="text-xs text-muted-foreground">Email</div>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={() => removeExistingPerson(p.id)} className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New Persons */}
                            {persons.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium">New Contacts</h4>
                                    <div className="space-y-3">
                                        {persons.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-md">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Name</Label>
                                                    <Input placeholder="Enter name" value={row.name} onChange={e => updatePersonRow(idx, "name", e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Phone</Label>
                                                    <Input placeholder="Enter phone" value={row.phone} onChange={e => updatePersonRow(idx, "phone", e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Email</Label>
                                                    <Input placeholder="Enter email" value={row.email} onChange={e => updatePersonRow(idx, "email", e.target.value)} />
                                                </div>
                                                <div className="flex items-end">
                                                    <Button variant="outline" size="sm" onClick={() => removeNewPersonRow(idx)} className="text-destructive w-full">
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Followup Scheduling */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Followup Scheduling
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Followup Frequency</Label>
                                    <Select value={frequency != null ? String(frequency) : undefined} onValueChange={val => form.setValue("frequency", Number(val))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose frequency" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {frequency === 6 && (
                                    <>
                                        {/* Stop Reason */}
                                        <div className="space-y-2 w-full">
                                            <Label>Stop Reason</Label>

                                            <Select value={stopReason != null ? String(stopReason) : undefined} onValueChange={val => form.setValue("stopReason", Number(val))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select reason" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    {Object.entries(STOP_REASON_LABELS).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Proof / Remarks */}
                                        <div className="space-y-2 w-full">
                                            {(stopReason === 2 || stopReason === 4) && (
                                                <>
                                                    <Label>{stopReason === 2 ? "Proof Details" : "Remarks"}</Label>

                                                    <Textarea
                                                        value={stopReason === 2 ? form.watch("proofText") || "" : form.watch("stopRemarks") || ""}
                                                        onChange={e =>
                                                            stopReason === 2 ? form.setValue("proofText", e.target.value) : form.setValue("stopRemarks", e.target.value)
                                                        }
                                                        placeholder={stopReason === 2 ? "Provide proof of objective achievement..." : "Enter remarks..."}
                                                        className="min-h-[80px]"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Detailed Request */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Detailed Request
                            </h3>
                            <TiptapEditor value={form.watch("details") || ""} onChange={val => form.setValue("details", val as any)} />
                        </div>

                        {/* Attachments */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Attachments
                            </h3>

                            <FilePond
                                files={newFiles}
                                onupdatefiles={handleFiles}
                                allowMultiple
                                instantUpload={false}
                                acceptedFileTypes={[
                                    "image/*",
                                    "application/pdf",
                                    "application/msword",
                                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                    "text/plain",
                                ]}
                            />
                        </div>

                        {existingAttachments.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Existing Attachments</h4>

                                <div className="space-y-2">
                                    {existingAttachments.map(file => (
                                        <div key={file} className="flex items-center justify-between p-2 border rounded-md">
                                            <span className="text-sm truncate">{file}</span>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => {
                                                    setExistingAttachments(prev => prev.filter(f => f !== file));
                                                    setRemovedAttachments(prev => [...prev, file]);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Previous Comment */}
                        {/* <div className="space-y-2">
                            <Label>Previous Comment</Label>
                            <Textarea value={followup.comment ?? ""} readOnly className="bg-muted/50 min-h-[80px]" />
                        </div> */}

                        {/* Submit */}
                        <div className="pt-4 border-t">
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button onClick={onSubmit}>Update Followup</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FollowUpEditPage;
