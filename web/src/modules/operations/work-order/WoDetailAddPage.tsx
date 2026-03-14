// src/pages/wo-details/AddWODetailsPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { ArrowLeft, Loader2, Plus, Trash2, Users } from "lucide-react";

/* ================================
   TYPES
================================ */
interface ContactRow {
    id: string;
    organization: string;
    department: string;
    name: string;
    designation: string;
    phone: string;
    email: string;
}

interface FormData {
    ld_applicable: string;
    max_ld: string;
    ld_start_date: string;
    max_ld_date: string;
    budget_pre_gst: string;
    pbg_applicable: string;
    contract_agreement: string;
}

type PageMode = "create" | "edit";

/* ================================
   CONSTANTS
================================ */
const DEPARTMENTS = [
    { value: "EIC", label: "EIC" },
    { value: "User", label: "User" },
    { value: "C&P", label: "C&P" },
    { value: "Finance", label: "Finance" },
];

/* ================================
   HELPERS
================================ */
const generateId = () => `row_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const createEmptyRow = (): ContactRow => ({
    id: generateId(),
    organization: "",
    department: "",
    name: "",
    designation: "",
    phone: "",
    email: "",
});

/* ================================
   MAIN COMPONENT
================================ */
const WoDetailAddPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    console.log("basic detail id : ", id);

    /* ================================
       STATE
    ================================ */
    const [mode, setMode] = useState<PageMode>("create");
    const [woDetailId, setWoDetailId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [contacts, setContacts] = useState<ContactRow[]>([createEmptyRow()]);
    const [formData, setFormData] = useState<FormData>({
        ld_applicable: "",
        max_ld: "",
        ld_start_date: "",
        max_ld_date: "",
        budget_pre_gst: "",
        pbg_applicable: "",
        contract_agreement: "",
    });

    /* ================================
       EXISTENCE CHECK (STRATEGY A)
       IMPORTANT:
       - This MUST be by basicDetailId
       - If backend does not have this yet,
         it will 404 and we stay in CREATE mode
    ================================ */
    useEffect(() => {
        const fetchWO = async () => {
            try {
                const { data } = await api.get(`/work-order/${id}`);

                if (data.woDetails?.id) {
                    // EDIT
                    setWoDetailId(data.woDetails.id);
                    hydrateFromBackend(data.woDetails);
                } else {
                    // CREATE
                    setWoDetailId(null);
                }
            } catch (err) {
                toast.error("Failed to load WO details");
            } finally {
                setLoading(false);
            }
        };

        fetchWO();
    }, [id]);
    /* ================================
       HYDRATION (EDIT MODE)
       Deserialize JSON-string columns
    ================================ */
    const hydrateFromBackend = (data: any) => {
        try {
            const organizations = JSON.parse(data.organization ?? "[]");
            const departments = JSON.parse(data.departments ?? "[]");
            const names = JSON.parse(data.name ?? "[]");
            const phones = JSON.parse(data.phone ?? "[]");
            const emails = JSON.parse(data.email ?? "[]");
            const designations = JSON.parse(data.designation ?? "[]");

            const maxLen = Math.max(organizations.length, departments.length, names.length, phones.length, emails.length, designations.length);

            const hydratedContacts = Array.from({ length: maxLen }).map((_, i) => ({
                id: generateId(),
                organization: organizations[i] ?? "",
                department: departments[i] ?? "",
                name: names[i] ?? "",
                designation: designations[i] ?? "",
                phone: phones[i] ?? "",
                email: emails[i] ?? "",
            }));

            setContacts(hydratedContacts.length ? hydratedContacts : [createEmptyRow()]);
        } catch {
            setContacts([createEmptyRow()]);
        }

        setFormData({
            ld_applicable: data.ldApplicable ? "1" : "0",
            max_ld: data.maxLd ?? "",
            ld_start_date: data.ldStartDate ?? "",
            max_ld_date: data.maxLdDate ?? "",
            budget_pre_gst: data.budget ?? "",
            pbg_applicable: data.pbgApplicable ? "1" : "0",
            contract_agreement: data.contractAgreementStatus ? "1" : "0",
        });
    };

    /* ================================
       CONTACT HANDLERS
    ================================ */
    const addContactRow = () => setContacts(prev => [...prev, createEmptyRow()]);

    const removeContactRow = (id: string) => {
        if (contacts.length > 1) {
            setContacts(prev => prev.filter(c => c.id !== id));
        }
    };

    const updateContact = (id: string, field: keyof ContactRow, value: string) => {
        setContacts(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
    };

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    /* ================================
       PAYLOAD BUILDER
       TEMP: JSON-string columns
    ================================ */
    const buildPayload = () => ({
        basicDetailId: Number(id),

        organization: JSON.stringify(contacts.map(c => c.organization || null)),
        departments: JSON.stringify(contacts.map(c => c.department || null)),
        name: JSON.stringify(contacts.map(c => c.name || null)),
        phone: JSON.stringify(contacts.map(c => c.phone || null)),
        email: JSON.stringify(contacts.map(c => c.email || null)),
        designation: JSON.stringify(contacts.map(c => c.designation || null)),

        budget: formData.budget_pre_gst || undefined,

        // 🔥 SEND 1 / 0 AS STRINGS
        ldApplicable: formData.ld_applicable ?? "0",
        pbgApplicable: formData.pbg_applicable ?? "0",
        contractAgreementStatus: formData.contract_agreement ?? "0",

        maxLd: formData.max_ld || undefined,
        ldStartDate: formData.ld_start_date || undefined,
        maxLdDate: formData.max_ld_date || undefined,
    });

    /* ================================
       SUBMIT
    ================================ */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = buildPayload();
            console.log(payload);

            if (woDetailId) {
                // UPDATE
                await api.put(`/work-order/details/${woDetailId}`, payload);
                toast.success("WO details updated successfully");
            } else {
                // CREATE
                await api.post("/work-order/details", payload);
                toast.success("WO details created successfully");
            }

            navigate(-1);
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? "Failed to save WO details");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-12 text-muted-foreground">Loading WO details…</div>;
    }

    /* ================================
       RENDER
    ================================ */
    return (
        <div className="min-h-screen py-6">
            <div className="container max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-semibold">{mode === "edit" ? "Edit WO Details" : "Add WO Details"}</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* CONTACT PERSONS */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Contact Persons
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Organization</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contacts.map(contact => (
                                        <TableRow key={contact.id}>
                                            <TableCell>
                                                <Input value={contact.organization} onChange={e => updateContact(contact.id, "organization", e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Select value={contact.department} onValueChange={v => updateContact(contact.id, "department", v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DEPARTMENTS.map(d => (
                                                            <SelectItem key={d.value} value={d.value}>
                                                                {d.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input value={contact.name} onChange={e => updateContact(contact.id, "name", e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input value={contact.designation} onChange={e => updateContact(contact.id, "designation", e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input value={contact.phone} onChange={e => updateContact(contact.id, "phone", e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input value={contact.email} onChange={e => updateContact(contact.id, "email", e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeContactRow(contact.id)} disabled={contacts.length === 1}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addContactRow}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Row
                            </Button>
                        </CardContent>
                    </Card>

                    {/* WO CONFIGURATION */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>WO Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>LD Applicable</Label>
                                    <Select value={formData.ld_applicable} onValueChange={v => handleChange("ld_applicable", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Yes</SelectItem>
                                            <SelectItem value="0">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.ld_applicable === "1" && (
                                    <>
                                        <div>
                                            <Label>Max LD %</Label>
                                            <Input type="number" value={formData.max_ld} onChange={e => handleChange("max_ld", e.target.value)} />
                                        </div>
                                        <div>
                                            <Label>LD Start Date</Label>
                                            <Input type="date" value={formData.ld_start_date} onChange={e => handleChange("ld_start_date", e.target.value)} />
                                        </div>
                                        <div>
                                            <Label>Max LD Date</Label>
                                            <Input type="date" value={formData.max_ld_date} onChange={e => handleChange("max_ld_date", e.target.value)} />
                                        </div>
                                    </>
                                )}
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label>Budget (Pre GST)</Label>
                                    <Input type="number" value={formData.budget_pre_gst} onChange={e => handleChange("budget_pre_gst", e.target.value)} />
                                </div>

                                <div>
                                    <Label>PBG Applicable</Label>
                                    <Select value={formData.pbg_applicable} onValueChange={v => handleChange("pbg_applicable", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Yes</SelectItem>
                                            <SelectItem value="0">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Contract Agreement</Label>
                                    <Select value={formData.contract_agreement} onValueChange={v => handleChange("contract_agreement", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Yes</SelectItem>
                                            <SelectItem value="0">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ACTIONS */}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WoDetailAddPage;
