import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

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

/* Icons */
import {
    ArrowLeft,
    Plus,
    Trash2,
    FileText,
    User,
    Calendar,
    Clock,
    MessageSquare,
    Building,
    DollarSign,
    UserCheck,
    Target,
} from "lucide-react";

/* -------------------------
   Dummy data
   ------------------------- */
const dummyFollowup = {
    id: 123,
    area: "Accounts",
    party_name: "Acme Corp",
    amount: 75000,
    assigned_to: 5,
    assigned_to_name: "John Doe",
    followup_for: "Pending Payment",
    followPerson: [
        { id: 1, name: "Rahul Sharma", phone: "+91 99999 88888", email: "rahul@example.com" },
        { id: 2, name: "Sunita Patel", phone: "+91 88888 77777", email: "sunita@example.com" },
    ],
    start_from: "2024-12-01",
    frequency: "1",
    details:
        "<p>Initial followup details here. Discuss payment schedule and clarify any pending documentation requirements.</p>",
    attachments: ["contract_agreement.pdf", "invoice_2345.png"],
    comment: "Client requested additional time for internal approvals. Follow up on December 1st.",
};

const FREQUENCIES: Record<string, string> = {
    "1": "Daily",
    "2": "Alternate Days",
    "3": "2 times a day",
    "4": "Weekly (every Mon)",
    "5": "Twice a Week (every Mon & Thu)",
    "6": "Stop",
};

const STOP_REASONS: Record<string, string> = {
    "1": "The person is getting angry/or has requested to stop",
    "2": "Followup Objective achieved",
    "3": "External Followup Initiated",
    "4": "Remarks",
};

export default function EditFollowupPage() {
    const navigate = useNavigate();

    /* form state */
    const [followup] = useState(dummyFollowup);
    const [persons, setPersons] = useState<Array<{ name: string; phone: string; email: string }>>([]);
    const [existingPersons, setExistingPersons] = useState(dummyFollowup.followPerson);
    const [startFrom, setStartFrom] = useState<string>(dummyFollowup.start_from);
    const [frequency, setFrequency] = useState<string>(dummyFollowup.frequency);
    const [stopReason, setStopReason] = useState<string>("");
    const [proofText, setProofText] = useState<string>("");
    const [stopRemark, setStopRemark] = useState<string>("");
    const [detailedHtml, setDetailedHtml] = useState<string>(dummyFollowup.details);
    const [comment] = useState<string>(dummyFollowup.comment);
    const [existingAttachments, setExistingAttachments] = useState<string[]>(dummyFollowup.attachments || []);
    const [files, setFiles] = useState<File[]>([]);

    /* -------------------------
     Person row handlers
     ------------------------- */
    const addPersonRow = () => {
        setPersons(p => [...p, { name: "", phone: "", email: "" }]);
    };

    const updatePersonRow = (idx: number, field: keyof (typeof persons)[number], value: string) => {
        setPersons(p => {
            const copy = [...p];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const removeNewPersonRow = (idx: number) => {
        setPersons(p => p.filter((_, i) => i !== idx));
    };

    const removeExistingPerson = (personId: number) => {
        setExistingPersons(prev => prev.filter(p => p.id !== personId));
    };

    /* -------------------------
     Files / Upload
     ------------------------- */
    const onDropFiles = useCallback(
        (incoming: FileList | null) => {
            if (!incoming) return;
            const arr = Array.from(incoming);

            const MAX_FILES = 5;
            if (existingAttachments.length + files.length + arr.length > MAX_FILES) {
                alert(`Max ${MAX_FILES} files allowed (including existing attachments).`);
                return;
            }

            const totalNewSize = arr.reduce((s, f) => s + f.size, 0);
            if (totalNewSize / 1024 / 1024 > 25) {
                alert("Total upload size of new files exceeds 25MB.");
                return;
            }

            setFiles(f => [...f, ...arr]);
        },
        [files, existingAttachments]
    );

    const removeExistingAttachment = (name: string) => {
        setExistingAttachments(a => a.filter(x => x !== name));
    };

    /* -------------------------
     Submit handler
     ------------------------- */
    const onSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!detailedHtml || detailedHtml.trim().length === 0) {
            alert("Please provide detailed request.");
            return;
        }

        const payload = {
            id: followup.id,
            start_from: startFrom,
            frequency,
            stopReason,
            proofText,
            stopRemark,
            detailed: detailedHtml,
            newPersons: persons,
            removedPersonIds: dummyFollowup.followPerson
                .map(p => p.id)
                .filter(id => !existingPersons.find(ep => ep.id === id)),
            existingAttachments,
            filesToUpload: files.map(f => f.name),
        };

        console.log("SUBMIT PAYLOAD:", payload);
        alert("Followup updated successfully!");
    };

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
                        <h1 className="text-3xl font-bold text-foreground">Edit Followup</h1>
                        <p className="text-muted-foreground mt-2">Update followup details and contact information</p>
                    </div>
                    <Badge
                        variant="secondary"
                        className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20"
                    >
                        ID: #{followup.id}
                    </Badge>
                </div>

                <Card className="shadow-lg border-border/50 backdrop-blur-sm bg-card/50">
                    <CardHeader className="pb-6 border-b border-border">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10">
                                <MessageSquare className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold text-foreground">Followup Details</CardTitle>
                                <CardDescription className="text-muted-foreground mt-1">
                                    Manage followups
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-8 pt-8">
                        {/* -----------------------------
            READONLY INFO SECTION
            ------------------------------ */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Calendar className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">Followup Information</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Area</Label>
                                    </div>
                                    <div className="p-3 rounded-lg border border-border bg-background/50 text-foreground font-medium">
                                        {followup.area}
                                    </div>
                                </div>

                                <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Organization</Label>
                                    </div>
                                    <div className="p-3 rounded-lg border border-border bg-background/50 text-foreground font-medium">
                                        {followup.party_name}
                                    </div>
                                </div>

                                <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Amount</Label>
                                    </div>
                                    <div className="p-3 rounded-lg border border-border bg-background/50 text-foreground font-semibold text-primary">
                                        ₹{followup.amount.toLocaleString()}
                                    </div>
                                </div>

                                <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Assigned To</Label>
                                    </div>
                                    <div className="p-3 rounded-lg border border-border bg-background/50 text-foreground font-medium">
                                        {followup.assigned_to_name}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">Followup For</Label>
                                    </div>
                                    <div className="p-3 rounded-lg border border-border bg-background/50 text-foreground">
                                        {followup.followup_for}
                                    </div>
                                </div>

                                <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-sm font-medium text-foreground">
                                            Next Follow-up Date
                                        </Label>
                                    </div>
                                    <DatePicker
                                        calendarClassName="min-h-[320px] shadow-xl border border-border bg-card"
                                        label="Select date"
                                        date={startFrom}
                                        onChange={setStartFrom}
                                    />
                                    <small className="text-xs text-muted-foreground mt-2 block">
                                        Must be today or a future date
                                    </small>
                                </div>
                            </div>
                        </section>

                        {/* -----------------------------
            CONTACT PERSONS
            ------------------------------ */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground">Contact Details</h3>
                                </div>
                                <Button
                                    onClick={addPersonRow}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200 rounded-xl"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Person
                                </Button>
                            </div>

                            {/* Existing Persons */}
                            {existingPersons.length > 0 && (
                                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                                    <h4 className="font-semibold text-foreground">Existing Contacts</h4>
                                    <div className="grid gap-3">
                                        {existingPersons.map(p => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-accent/50 transition-colors duration-200"
                                            >
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div>
                                                        <div className="text-sm font-medium text-foreground">
                                                            {p.name}
                                                        </div>
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
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
                                    <h4 className="font-semibold text-foreground">New Contacts</h4>
                                    <div className="space-y-4">
                                        {persons.map((row, idx) => (
                                            <div
                                                key={idx}
                                                className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg border border-primary/20 bg-card"
                                            >
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
                                    <Clock className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">Followup Scheduling</h3>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                    <Label className="text-sm font-medium text-foreground">Followup Frequency</Label>
                                    <Select value={frequency} onValueChange={setFrequency}>
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

                                {frequency === "6" && (
                                    <>
                                        <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                            <Label className="text-sm font-medium text-foreground">Stop Reason</Label>
                                            <Select value={stopReason} onValueChange={setStopReason}>
                                                <SelectTrigger className="border-border focus:ring-destructive focus:border-destructive rounded-lg">
                                                    <SelectValue placeholder="Select reason" />
                                                </SelectTrigger>
                                                <SelectContent className="border-border bg-card rounded-xl">
                                                    {Object.entries(STOP_REASONS).map(([k, v]) => (
                                                        <SelectItem
                                                            key={k}
                                                            value={k}
                                                            className="focus:bg-destructive/10 rounded-lg"
                                                        >
                                                            {v}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
                                            {(stopReason === "2" || stopReason === "4") && (
                                                <>
                                                    <Label className="text-sm font-medium text-foreground">
                                                        {stopReason === "2" ? "Proof Details" : "Remarks"}
                                                    </Label>
                                                    <Textarea
                                                        value={stopReason === "2" ? proofText : stopRemark}
                                                        onChange={e =>
                                                            stopReason === "2"
                                                                ? setProofText(e.target.value)
                                                                : setStopRemark(e.target.value)
                                                        }
                                                        placeholder={
                                                            stopReason === "2"
                                                                ? "Provide proof of objective achievement..."
                                                                : "Enter remarks..."
                                                        }
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
                                <h3 className="text-xl font-semibold text-foreground">Detailed Request</h3>
                            </div>
                            <TiptapEditor value={detailedHtml} onChange={setDetailedHtml} />
                        </section>

                        {/* -----------------------------
            ATTACHMENTS
            ------------------------------ */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">Attachments</h3>
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
                                    <h4 className="font-semibold text-foreground">Current Attachments</h4>
                                    <div className="grid gap-2">
                                        {existingAttachments.map(file => (
                                            <div
                                                key={file}
                                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50"
                                            >
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
                            <Textarea
                                value={comment}
                                readOnly
                                className="bg-background/50 border-border text-foreground rounded-lg min-h-[100px] resize-none"
                            />
                        </section>

                        {/* SUBMIT */}
                        <div className="pt-6 border-t border-border">
                            <div className="flex gap-4 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(-1)}
                                    className="rounded-lg border-border"
                                >
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
}
