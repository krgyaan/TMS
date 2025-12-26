import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ArrowLeft } from "lucide-react";
import { paths } from "@/app/routes/paths";

// ⬅ NEW HOOK IMPORTS
import {
    useCreateImprest,
    useUploadImprestProofs,
    // useImprestCategories,   // enable when backend supports categories
} from "./imprest.hooks";

import { createImprestSchema, type CreateImprestInput } from "./imprest.schema";

registerPlugin(FilePondPluginFileValidateType, FilePondPluginImagePreview);

const EmployeeImprestForm: React.FC = () => {
    const navigate = useNavigate();

    const [pondFiles, setPondFiles] = useState<File[]>([]);

    /**
     * React Query Mutations
     */
    const createMutation = useCreateImprest();
    const uploadProofsMutation = useUploadImprestProofs();

    /**
     * React Hook Form
     */
    const { register, handleSubmit, formState, setValue } = useForm<CreateImprestInput>({
        resolver: zodResolver(createImprestSchema),
        defaultValues: {
            partyName: null,
            projectName: null,
            amount: undefined,
            categoryId: null,
            teamId: undefined,
            remark: "",
        },
    });

    const { errors } = formState;

    /**
     * Submit handler
     */
    const onSubmit = (data: CreateImprestInput) => {
        createMutation.mutate(data, {
            onSuccess: async created => {
                toast.success("Imprest created successfully");

                if (pondFiles.length > 0) {
                    uploadProofsMutation.mutate(
                        { id: created.id, files: pondFiles },
                        {
                            onSuccess: () => toast.success("Uploaded proofs"),
                            onError: () => toast.error("Imprest created but proof upload failed"),
                        }
                    );
                }

                navigate(paths.shared.imprest);
            },
            onError: err => {
                console.error(err);
                toast.error("Failed to create imprest");
            },
        });
    };

    /**
     * FilePond handler
     */
    const handlePondProcess = (items: any[]) => {
        const files = items.map(fi => fi.file).filter(Boolean);
        setPondFiles(files);
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="sm" onClick={() => navigate(paths.shared.imprest)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Add Employee Imprest</h1>
                    <p className="text-muted-foreground">Create a new imprest entry</p>
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
                            {/* Party Name */}
                            <div className="space-y-2">
                                <Label>Party Name</Label>
                                <Input placeholder="Party Name" {...register("partyName")} />
                                {errors.partyName && <p className="text-sm text-red-600">{errors.partyName.message}</p>}
                            </div>

                            {/* Project Name */}
                            <div className="space-y-2">
                                <Label>Project Name</Label>
                                <Input placeholder="Project Name" {...register("projectName")} />
                                {errors.projectName && <p className="text-sm text-red-600">{errors.projectName.message}</p>}
                            </div>

                            {/* Amount */}
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input type="number" placeholder="Amount" {...register("amount", { valueAsNumber: true })} />
                                {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
                            </div>

                            {/* Team ID */}
                            <div className="space-y-2">
                                <Label>Team (ID)</Label>
                                <Input type="number" placeholder="Team member id" {...register("teamId", { valueAsNumber: true })} />
                            </div>

                            {/* Proof Upload */}
                            <div className="space-y-2 lg:col-span-3">
                                <Label>Invoice / Proof</Label>
                                <FilePond
                                    files={pondFiles}
                                    onupdatefiles={handlePondProcess}
                                    allowMultiple
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
                                <Textarea rows={4} {...register("remark")} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={createMutation.isLoading}>
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
