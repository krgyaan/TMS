import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import { ArrowLeft } from "lucide-react";

import { paths } from "@/app/routes/paths"; // optional, keep if you have route paths defined

registerPlugin(FilePondPluginFileValidateType, FilePondPluginImagePreview);

/** ------------------------
 * Zod schemas (frontend)
 * ------------------------ */
const createSchema = z.object({
    name_id: z.number().int({ message: "Select a user" }),
    party_name: z.string().optional().nullable(),
    project_name: z.string().optional().nullable(),
    amount: z.number().min(1, "Amount must be at least 1"),
    category: z.string().optional().nullable(),
    team_id: z.number().optional().nullable(),
    remark: z.string().optional().nullable(),
});

type CreateFormValues = z.infer<typeof createSchema>;

/** ------------------------
 * API helpers
 * ------------------------ */
async function fetchCategories() {
    const res = await api.get("/categories"); // expect [{ id, category, heading, status }]
    return res.data;
}

async function createImprest(payload: CreateFormValues) {
    const res = await api.post("/employee-imprest", payload);
    return res.data; // expect created record (with id)
}

async function uploadProofs(imprestId: number, files: File[]) {
    if (!files?.length) return null;
    const form = new FormData();
    files.forEach(f => form.append("invoice_proof[]", f));
    const res = await api.post(`/employee-imprest/${imprestId}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
}

/** ------------------------
 * Component
 * ------------------------ */
const EmployeeImprestForm: React.FC = () => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [pondFiles, setPondFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, setValue, watch, formState } = useForm<CreateFormValues>({
        resolver: zodResolver(createSchema),
        defaultValues: {
            name_id: undefined as unknown as number,
            party_name: "",
            project_name: "",
            amount: undefined as unknown as number,
            category: "",
            team_id: undefined as unknown as number,
            remark: "",
        },
    });

    const { errors } = formState;

    // Fetch categories from API
    const { data: categories = [], isLoading: catLoading } = useQuery({
        queryKey: ["categories"],
        queryFn: fetchCategories,
        staleTime: 1000 * 60 * 5,
    });

    const createMutation = useMutation({
        mutationFn: createImprest,
        onSuccess: async created => {
            toast.success("Created imprest");

            if (pondFiles.length > 0) {
                try {
                    await uploadProofs(created.id, pondFiles);
                    toast.success("Uploaded proofs");
                } catch (e) {
                    console.error(e);
                    toast.error("Imprest created but file upload failed");
                }
            }

            qc.invalidateQueries({ queryKey: ["employee-imprests"] });
            navigate(paths?.employeeImprest ?? "/employee-imprest");
        },
        onError: (err: any) => {
            console.error(err);
            toast.error("Failed to create imprest");
        },
    });

    const onSubmit = (data: CreateFormValues) => {
        setIsSubmitting(true);
        createMutation.mutate({
            ...data,
            // ensure name_id, amount are numbers
            name_id: Number(data.name_id),
            amount: Number(data.amount),
            team_id: data.team_id ? Number(data.team_id) : undefined,
        });
    };

    /** FilePond -> collect File objects in local state */
    const handlePondProcess = (fileItems: any[]) => {
        // FilePond gives FilePondFile objects; take .file
        const files = fileItems.map(fi => fi.file).filter(Boolean);
        setPondFiles(files);
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(paths?.employeeImprest ?? -1)}>
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Add Employee Imprest</h1>
                        <p className="text-muted-foreground">Create a new imprest entry</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add Employee Imprest</CardTitle>
                    <CardDescription>Fill in details and attach invoice/proof files</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Name (Assuming an admin selects name_id else frontend will prefill) */}
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input type="number" placeholder="Enter user id (or use user select implementation)" {...register("name_id", { valueAsNumber: true })} />
                                {errors.name_id && <p className="text-sm text-destructive">{errors.name_id.message}</p>}
                            </div>

                            {/* Party Name */}
                            <div className="space-y-2">
                                <Label>Party Name</Label>
                                <Input placeholder="Party Name" {...register("party_name")} />
                                {errors.party_name && <p className="text-sm text-destructive">{errors.party_name.message}</p>}
                            </div>

                            {/* Project Name */}
                            <div className="space-y-2">
                                <Label>Project Name</Label>
                                <Input placeholder="Project Name" {...register("project_name")} />
                                {errors.project_name && <p className="text-sm text-destructive">{errors.project_name.message}</p>}
                            </div>

                            {/* Amount */}
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input type="number" placeholder="Amount" {...register("amount", { valueAsNumber: true })} />
                                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                            </div>

                            {/* Category (fetched from API) */}
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select onValueChange={val => setValue("category", val)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={catLoading ? "Loading..." : "Select category"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.map((c: any) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
                            </div>

                            {/* Team - simple numeric input for now */}
                            <div className="space-y-2">
                                <Label>Team (ID)</Label>
                                <Input type="number" {...register("team_id", { valueAsNumber: true })} placeholder="Team member id" />
                            </div>

                            {/* Invoice Proof (FilePond) */}
                            <div className="space-y-2 lg:col-span-3">
                                <Label>Invoice / Proof</Label>
                                <FilePond
                                    files={pondFiles}
                                    onupdatefiles={handlePondProcess}
                                    allowMultiple={true}
                                    name="invoice_proof"
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

                            {/* Remarks */}
                            <div className="space-y-2 lg:col-span-3">
                                <Label>Remarks</Label>
                                <textarea rows={4} className="w-full rounded-md border border-input px-3 py-2" {...register("remark")} />
                                {errors.remark && <p className="text-sm text-destructive">{errors.remark.message}</p>}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting || createMutation.isLoading}>
                                {createMutation.isLoading ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default EmployeeImprestForm;
