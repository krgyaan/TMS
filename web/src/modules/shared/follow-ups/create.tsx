"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Trash } from "lucide-react";

/** ----------------------
 * Types
 * ---------------------- */
export type ContactPerson = {
    id: string; // uuid or index string
    name: string;
    email?: string;
    phone?: string;
};

export type FollowUpPayload = {
    area: string;
    party_name: string;
    contact_persons: ContactPerson[];
    followup_for?: string;
    amount?: number | null;
    assigned_to?: string | null;
    comment?: string;
    created_by?: string | null;
};

/** ----------------------
 * Mock data (replace with API data later)
 * ---------------------- */
const AREAS = [
    { id: "1", name: "PG Personal" },
    { id: "2", name: "Accounts" },
    { id: "3", name: "AC Team" },
    { id: "4", name: "DC team" },
];

const REASONS = [
    { id: "r1", name: "New Enquiry" },
    { id: "r2", name: "Payment Followup" },
    { id: "r3", name: "Contract Renewal" },
];

const USERS = [
    { id: "u1", name: "John Doe" },
    { id: "u2", name: "Jane Smith" },
    { id: "u3", name: "Ravi Kumar" },
];

/** ----------------------
 * Helper utils
 * ---------------------- */
const uid = (prefix = "") => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

/** ----------------------
 * Component
 * ---------------------- */
export default function CreateFollowUpPage() {
    // Form state
    const [area, setArea] = useState<string>("");
    const [partyName, setPartyName] = useState<string>("");
    const [followupFor, setFollowupFor] = useState<string>("");
    const [amount, setAmount] = useState<string>(""); // keep as string for easier input handling
    const [assignedTo, setAssignedTo] = useState<string>("");
    const [comment, setComment] = useState<string>("");
    const [contactPersons, setContactPersons] = useState<ContactPerson[]>([
        {
            id: uid("cp_"),
            name: "",
            email: "",
            phone: "",
        },
    ]);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    /** Validation - simple */
    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!area) e.area = "Area is required";
        if (!partyName.trim()) e.party_name = "Organisation name is required";
        // At least one contact person with name or email or phone
        const validContact = contactPersons.some(c => c.name.trim() || c.email?.trim() || c.phone?.toString().trim());
        if (!validContact) e.contact_persons = "Add at least one contact person";
        // assigned_to required
        if (!assignedTo) e.assigned_to = "Please assign followup";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /** Add contact person row */
    const addContactPerson = () => {
        setContactPersons(prev => [...prev, { id: uid("cp_"), name: "", email: "", phone: "" }]);
    };

    /** Remove contact person */
    const removeContactPerson = (id: string) => {
        setContactPersons(prev => prev.filter(p => p.id !== id));
    };

    /** Update contact person field */
    const updateContactPerson = (id: string, field: keyof ContactPerson, value: string) => {
        setContactPersons(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
    };

    /** Submit handler (UI-only) */
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!validate()) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        setSubmitting(true);

        // Build payload (convert amount to number or null)
        const payload: FollowUpPayload = {
            area,
            party_name: partyName.trim(),
            contact_persons: contactPersons,
            followup_for: followupFor || undefined,
            amount: amount ? Number(amount) : null,
            assigned_to: assignedTo || null,
            comment: comment || undefined,
            created_by: "currentUserId-placeholder", // replace when integrating
        };

        // UI-only behavior: log payload
        console.log("FollowUp payload:", payload);

        // Example fetch to backend when ready (uncomment & adapt)
        /*
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      // show success / redirect / clear form
    } catch (err) {
      // show error
    }
    */

        // Simulate delay
        setTimeout(() => {
            setSubmitting(false);
            alert("Follow-up payload logged to console. Integrate backend to persist.");
        }, 700);
    };

    return (
        <section className="mx-auto p-4">
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>Assign Followup</CardTitle>
                    <div>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                                // replace with router.back() or navigate to list
                                window.history.back();
                            }}
                        >
                            Go Back
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* top actions */}
                    <div className="flex items-center justify-end mb-4"></div>

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Alerts for validation */}
                        {Object.keys(errors).length > 0 && (
                            <div className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                                <div className="font-medium">Please fix the errors below</div>
                                <ul className="mt-2 list-disc pl-5">
                                    {Object.entries(errors).map(([k, v]) => (
                                        <li key={k}>{v}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Row 1: Area & Organisation */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Area</label>
                                <Select value={area} onValueChange={setArea}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose area" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AREAS.map(a => {
                                            if (!a.id) console.error("EMPTY ID!", a);
                                            if (!a.name) console.error("EMPTY NAME!", a);
                                            return (
                                                <SelectItem key={a.id} value={String(a.id)}>
                                                    {a.name}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Organisation Name</label>
                                <Input
                                    value={partyName}
                                    onChange={e => setPartyName(e.target.value)}
                                    placeholder="Organisation name"
                                />
                            </div>
                        </div>

                        {/* Contact persons dynamic */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium">Contact details</h4>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={ev => {
                                        ev.preventDefault();
                                        addContactPerson();
                                    }}
                                >
                                    Add Person
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {contactPersons.map((cp, idx) => (
                                    <div
                                        key={cp.id}
                                        className={cn(
                                            "grid grid-cols-1 md:grid-cols-12 gap-3 items-end",
                                            "border rounded-md p-3"
                                        )}
                                    >
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-medium mb-1">Name</label>
                                            <Input
                                                value={cp.name}
                                                onChange={e => updateContactPerson(cp.id, "name", e.target.value)}
                                                placeholder={`Contact ${idx + 1} name`}
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-medium mb-1">Email</label>
                                            <Input
                                                value={cp.email}
                                                onChange={e => updateContactPerson(cp.id, "email", e.target.value)}
                                                placeholder="Email"
                                                type="email"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-medium mb-1">Phone</label>
                                            <Input
                                                value={cp.phone}
                                                onChange={e => updateContactPerson(cp.id, "phone", e.target.value)}
                                                placeholder="Phone"
                                                type="tel"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex justify-end">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={ev => {
                                                    ev.preventDefault();
                                                    // avoid removing last contact
                                                    if (contactPersons.length === 1) {
                                                        // clear instead
                                                        updateContactPerson(cp.id, "name", "");
                                                        updateContactPerson(cp.id, "email", "");
                                                        updateContactPerson(cp.id, "phone", "");
                                                        return;
                                                    }
                                                    removeContactPerson(cp.id);
                                                }}
                                                aria-label="Remove contact person"
                                                className="h-8 w-8"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {errors.contact_persons && (
                                <p className="mt-2 text-sm text-red-600">{errors.contact_persons}</p>
                            )}
                        </div>

                        {/* Other fields row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Followup For</label>
                                <Select value={followupFor} onValueChange={setFollowupFor}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REASONS.map(r => (
                                            <SelectItem key={String(r.id)} value={String(r.name)}>
                                                {String(r.name)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Amount Involved</label>
                                <Input
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    type="number"
                                    step="any"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Followup Assigned to</label>
                                <Select value={assignedTo} onValueChange={setAssignedTo}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {USERS.map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.assigned_to && (
                                    <p className="mt-1 text-xs text-red-600">{errors.assigned_to}</p>
                                )}
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="mt-6">
                            <label className="block text-sm font-medium mb-1">Comment</label>
                            <Textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                rows={3}
                                placeholder="Add comment for assignee."
                            />
                        </div>

                        {/* Submit */}
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => window.history.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}
