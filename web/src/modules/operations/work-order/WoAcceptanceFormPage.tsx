// src/pages/wo-acceptance/WOAcceptancePage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import api from "@/lib/axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { ArrowLeft, Loader2, Plus, Trash2, FileText, ExternalLink, X, FileCheck, AlertTriangle } from "lucide-react";

/* ================================
   TYPES
================================ */
interface AmendmentRow {
    id: string;
    page_no: string;
    clause_no: string;
    current_statement: string;
    corrected_statement: string;
}

/* ================================
   CONSTANTS
================================ */
const FOLLOWUP_OPTIONS = [
    { value: "daily", label: "Daily" },
    { value: "alternate", label: "Alternate Days" },
    { value: "weekly", label: "Weekly" },
];

/* ================================
   HELPERS
================================ */
const generateId = () => `row_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const createEmptyAmendment = (): AmendmentRow => ({
    id: generateId(),
    page_no: "",
    clause_no: "",
    current_statement: "",
    corrected_statement: "",
});

/* ================================
   MAIN COMPONENT
================================ */
const WoAcceptanceFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { id: basicDetailId } = useParams<{ id: string }>();

    /* ================================
       STATE
    ================================ */
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [acceptanceId, setAcceptanceId] = useState<number | null>(null);

    const [amendmentNeeded, setAmendmentNeeded] = useState<string>("");

    const [acceptedSignedFile, setAcceptedSignedFile] = useState<File | null>(null);
    const [existingFile, setExistingFile] = useState<string | null>(null);

    const [amendments, setAmendments] = useState<AmendmentRow[]>([createEmptyAmendment()]);

    const [followupFrequency, setFollowupFrequency] = useState<string>("");

    /* ================================
       FETCH + HYDRATE
    ================================ */
    useEffect(() => {
        const fetchAcceptance = async () => {
            try {
                const { data } = await api.get(`/work-order/${basicDetailId}`);

                const acceptance = data.woAcceptance;

                if (acceptance?.id) {
                    // EDIT MODE
                    setAcceptanceId(acceptance.id);

                    setAmendmentNeeded(acceptance.woYes === "1" ? "0" : "1");
                    setFollowupFrequency(acceptance.followupFrequency ?? "");

                    if (acceptance.acceptedSigned) {
                        setExistingFile(acceptance.acceptedSigned);
                    }

                    if (acceptance.pageNo) {
                        const pageNos = JSON.parse(acceptance.pageNo ?? "[]");
                        const clauseNos = JSON.parse(acceptance.clauseNo ?? "[]");
                        const currentStatements = JSON.parse(acceptance.currentStatement ?? "[]");
                        const correctedStatements = JSON.parse(acceptance.correctedStatement ?? "[]");

                        const rows = pageNos.map((_: any, i: number) => ({
                            id: generateId(),
                            page_no: pageNos[i] ?? "",
                            clause_no: clauseNos[i] ?? "",
                            current_statement: currentStatements[i] ?? "",
                            corrected_statement: correctedStatements[i] ?? "",
                        }));

                        setAmendments(rows.length ? rows : [createEmptyAmendment()]);
                    }
                }
            } catch {
                toast.error("Failed to load WO Acceptance details");
            } finally {
                setLoading(false);
            }
        };

        fetchAcceptance();
    }, [basicDetailId]);

    /* ================================
       AMENDMENT HANDLERS
    ================================ */
    const addAmendmentRow = () => {
        setAmendments(prev => [...prev, createEmptyAmendment()]);
    };

    const removeAmendmentRow = (rowId: string) => {
        if (amendments.length > 1) {
            setAmendments(prev => prev.filter(r => r.id !== rowId));
        }
    };

    const updateAmendment = (rowId: string, field: keyof AmendmentRow, value: string) => {
        setAmendments(prev => prev.map(r => (r.id === rowId ? { ...r, [field]: value } : r)));
    };

    /* ================================
       SUBMIT
    ================================ */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload: any = {
                basicDetailId: Number(basicDetailId),
                woYes: amendmentNeeded === "0" ? "1" : "0",
            };

            if (amendmentNeeded === "1") {
                payload.pageNo = JSON.stringify(amendments.map(a => a.page_no || null));
                payload.clauseNo = JSON.stringify(amendments.map(a => a.clause_no || null));
                payload.currentStatement = JSON.stringify(amendments.map(a => a.current_statement || null));
                payload.correctedStatement = JSON.stringify(amendments.map(a => a.corrected_statement || null));
                if (followupFrequency) {
                    payload.followupFrequency = followupFrequency;
                }
            }

            if (acceptanceId) {
                await api.put(`/work-order/acceptance/${acceptanceId}`, payload);
                toast.success("WO Acceptance updated successfully");
            } else {
                await api.post("/work-order/acceptance", payload);
                toast.success("WO Acceptance created successfully");
            }

            navigate(-1);
        } catch (err: any) {
            const data = err.response?.data;

            if (Array.isArray(data?.errors)) {
                data.errors.forEach((e: any) => {
                    toast.error(`${e.path.join(".")}: ${e.message}`);
                });
            } else {
                toast.error(data?.message ?? "Failed to save WO Acceptance");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ================================
       LOADING
    ================================ */
    if (loading) {
        return <div className="flex justify-center py-12 text-muted-foreground">Loading WO Acceptance…</div>;
    }

    /* ================================
       RENDER
    ================================ */
    return (
        <div className="min-h-screen py-6">
            <div className="container max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-semibold">WO Acceptance</h1>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Amendment Needed */}
                            <div className="max-w-sm">
                                <Label>
                                    WO Amendment Needed <span className="text-destructive">*</span>
                                </Label>
                                <Select value={amendmentNeeded} onValueChange={setAmendmentNeeded}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Yes</SelectItem>
                                        <SelectItem value="0">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* NO - Accepted */}
                            {amendmentNeeded === "0" && (
                                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                    <div className="flex items-start gap-3">
                                        <FileCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium">WO Accepted</p>
                                            <p className="text-sm text-muted-foreground">Upload the accepted & signed WO</p>
                                        </div>
                                    </div>

                                    <div className="max-w-md">
                                        <Label>Accepted & Signed Copy</Label>
                                        {!acceptedSignedFile && !existingFile ? (
                                            <Input type="file" accept="image/*,.pdf" className="mt-2" onChange={e => setAcceptedSignedFile(e.target.files?.[0] || null)} />
                                        ) : (
                                            <div className="flex items-center gap-2 p-2 mt-2 border rounded-md">
                                                <FileText className="h-4 w-4" />
                                                <span className="text-sm truncate flex-1">{acceptedSignedFile?.name || existingFile}</span>
                                                {existingFile && !acceptedSignedFile && (
                                                    <a
                                                        href={`/uploads/acceptance/${existingFile}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary text-xs flex items-center gap-1"
                                                    >
                                                        View <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setAcceptedSignedFile(null);
                                                        setExistingFile(null);
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* YES - Amendments */}
                            {amendmentNeeded === "1" && (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 border border-amber-200 rounded-lg bg-amber-50">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-amber-800">Amendment Required</p>
                                            <p className="text-sm text-amber-700">Add amendment clauses</p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-3">
                                            <Label>Amendment Details</Label>
                                            <Button type="button" variant="outline" size="sm" onClick={addAmendmentRow}>
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add Row
                                            </Button>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Page No</TableHead>
                                                    <TableHead>Clause No</TableHead>
                                                    <TableHead>Current Statement</TableHead>
                                                    <TableHead>Corrected Statement</TableHead>
                                                    <TableHead />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {amendments.map(row => (
                                                    <TableRow key={row.id}>
                                                        <TableCell>
                                                            <Input value={row.page_no} onChange={e => updateAmendment(row.id, "page_no", e.target.value)} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input value={row.clause_no} onChange={e => updateAmendment(row.id, "clause_no", e.target.value)} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Textarea value={row.current_statement} onChange={e => updateAmendment(row.id, "current_statement", e.target.value)} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Textarea
                                                                value={row.corrected_statement}
                                                                onChange={e => updateAmendment(row.id, "corrected_statement", e.target.value)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeAmendmentRow(row.id)}
                                                                disabled={amendments.length === 1}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="max-w-sm">
                                        <Label>Followup Frequency</Label>
                                        <Select value={followupFrequency} onValueChange={setFollowupFrequency}>
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="Select frequency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FOLLOWUP_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || !amendmentNeeded}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {acceptanceId ? "Update" : "Submit"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default WoAcceptanceFormPage;
