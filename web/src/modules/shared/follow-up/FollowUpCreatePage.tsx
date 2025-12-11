"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { Trash } from "lucide-react";

import { useCreateFollowUp } from "@/modules/shared/follow-up/follow-up.hooks";
import { useUsers } from "@/hooks/api/useUsers";
import { CreateFollowUpFormSchema, type CreateFollowUpFormValues, type CreateFollowUpDto } from "@/modules/shared/follow-up/follow-up.types";
import { useFollowupCategories } from "@/hooks/api/useFollowupCategories";

import { paths } from "@/app/routes/paths";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* -----------------------
   Mock Data (same as yours)
------------------------ */
const AREAS = [
    { id: 1, name: "PG Personal" },
    { id: 2, name: "Accounts" },
    { id: 3, name: "AC Team" },
    { id: 4, name: "DC team" },
];

/* -----------------------
   Component
------------------------ */
const FollowUpCreatePage = () => {
    const { mutateAsync, isPending } = useCreateFollowUp();
    const navigate = useNavigate();

    const form = useForm<CreateFollowUpFormValues>({
        resolver: zodResolver(CreateFollowUpFormSchema),
        defaultValues: {
            area: "",
            partyName: "",
            amount: "",
            assignedTo: "",
            comment: "",
            followupFor: "",
            contacts: [{ id: crypto.randomUUID(), name: "", email: "", phone: "" }],
        },
    });

    const {
        control,
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "contacts",
    });

    const { data: users = [], isLoading: usersLoading } = useUsers();
    const { data: followUpCategories = [], isLoading: followUpCategoryLoading } = useFollowupCategories();
    /* -----------------------
     SUBMIT HANDLER ✅
  ------------------------ */
    const onSubmit = async (values: CreateFollowUpFormValues) => {
        try {
            const payload: CreateFollowUpDto = {
                area: values.area,
                partyName: values.partyName,
                amount: values.amount ? Number(values.amount) : undefined,
                assignedToId: Number(values.assignedTo),
                comment: values.comment,
                contacts: values.contacts.map(c => ({
                    name: c.name,
                    email: c.email || null,
                    phone: c.phone || null,
                })),
            };

            await mutateAsync(payload);

            toast.success("Follow Up Created Successfully");
            navigate(paths.shared.followUp);
        } catch (error: any) {
            console.error("Create follow-up failed:", error);

            // ✅ Best-practice error message extraction
            const message = error?.response?.data?.message || error?.message || "Failed to create follow-up";

            toast.error(message);
        }
    };

    return (
        <section className="mx-auto p-4">
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>Assign Followup</CardTitle>
                    <Button size="sm" onClick={() => window.history.back()}>
                        Go Back
                    </Button>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        {/* ---------------- Area + Organisation ---------------- */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="w-full">
                                <label className="text-sm font-medium">Area</label>
                                <Select onValueChange={v => setValue("area", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose area" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AREAS.map(a => (
                                            <SelectItem key={a.id} value={a.name}>
                                                {a.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.area && <p className="text-red-500 text-xs">{errors.area.message}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm font-medium">Organisation</label>
                                <Input {...register("partyName")} />
                                {errors.partyName && <p className="text-red-500 text-xs">{errors.partyName.message}</p>}
                            </div>
                        </div>

                        {/* ---------------- CONTACT PERSONS ---------------- */}
                        <div className="mt-6">
                            <div className="flex justify-between">
                                <h4 className="font-medium">Contact Details</h4>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() =>
                                        append({
                                            id: crypto.randomUUID(),
                                            name: "",
                                            email: "",
                                            phone: "",
                                        })
                                    }
                                >
                                    Add Person
                                </Button>
                            </div>

                            {fields.map((cp, idx) => (
                                <div key={cp.id} className="grid md:grid-cols-12 gap-3 mt-3 border p-3 rounded">
                                    <div className="md:col-span-4">
                                        <Input placeholder="Name" {...register(`contacts.${idx}.name`)} />
                                    </div>
                                    <div className="md:col-span-4">
                                        <Input placeholder="Email" {...register(`contacts.${idx}.email`)} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Input placeholder="Phone" {...register(`contacts.${idx}.phone`)} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <Button type="button" size="icon" variant="destructive" onClick={() => remove(idx)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ---------------- OTHER FIELDS ---------------- */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <div>
                                <label className="text-sm font-medium">Followup For</label>
                                <Select onValueChange={v => setValue("followupFor", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {followUpCategories.map(r => (
                                            <SelectItem key={r.id} value={String(r.id)}>
                                                {r.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Amount</label>
                                <Input {...register("amount")} type="number" />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Assign To</label>
                                <Select onValueChange={v => setValue("assignedTo", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.assignedTo && <p className="text-red-500 text-xs">{errors.assignedTo.message}</p>}
                            </div>
                        </div>

                        {/* ---------------- COMMENT ---------------- */}
                        <div className="mt-6">
                            <Textarea placeholder="Comment" {...register("comment")} />
                        </div>

                        {/* ---------------- SUBMIT ---------------- */}
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => window.history.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
};

export default FollowUpCreatePage;
