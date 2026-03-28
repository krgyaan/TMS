import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useCreateImprest } from "./imprest.hooks";
import { createImprestSchema, type CreateImprestInput } from "./imprest.schema";
import SelectField from "@/components/form/SelectField";
import SelectInput from "@/components/SelectInput";
import { useProjectOptions } from "@/hooks/useSelectOptions";
import { useImprestCategories } from "@/hooks/api/useImprestCategories";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/api/useUsers";

registerPlugin(FilePondPluginFileValidateType, FilePondPluginImagePreview);

const TEAM_MEMBER_CATEGORY_ID = 22;

const EmployeeImprestForm: React.FC = () => {
    const navigate = useNavigate();
    const projectOptions = useProjectOptions();
    const { data: imprestCategories = [] } = useImprestCategories();
    const { user } = useAuth();
    const { data: allUsers = [] } = useUsers();

    const [pondFiles, setPondFiles] = useState<File[]>([]);
    const [selectedTransferUserId, setSelectedTransferUserId] = useState<string>("");
    const [transferUserError, setTransferUserError] = useState<string>("");

    // Single mutation — backend decides what to insert based on categoryId
    const createMutation = useCreateImprest();

    const methods = useForm<CreateImprestInput>({
        resolver: zodResolver(createImprestSchema),
        defaultValues: {
            userId: undefined,
            partyName: null,
            projectName: null,
            amount: undefined,
            categoryId: null,
            teamId: undefined,
            remark: "",
        },
    });

    const {
        register,
        control,
        formState: { errors },
        handleSubmit,
        setValue,
        watch,
    } = methods;

    useEffect(() => {
        if (user?.id) {
            setValue("userId", user.id);
        }
    }, [user, setValue]);

    const watchedCategoryId = watch("categoryId");
    const isTransferMode = Number(watchedCategoryId) === TEAM_MEMBER_CATEGORY_ID;

    // Reset transfer state when category changes
    useEffect(() => {
        setSelectedTransferUserId("");
        setTransferUserError("");
    }, [watchedCategoryId]);

    // All users except self
    const transferUserOptions = allUsers
        .filter(u => u.id !== user?.id && u.isActive === true)
        .map(u => ({
            id: String(u.id),
            // Convert to Title Case for uniformity
            name: u.name?.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()),
        }))
        // Sort alphabetically by name
        .sort((a, b) => a.name.localeCompare(b.name));

    const onSubmit = async (data: CreateImprestInput) => {
        // Validate transfer user selection before submitting
        if (isTransferMode && !selectedTransferUserId) {
            setTransferUserError("Please select a team member");
            return;
        }

        setTransferUserError("");

        await createMutation.mutateAsync({
            data: {
                ...data,
                transferToId: isTransferMode ? Number(selectedTransferUserId) : null,
                user,
            },
            files: pondFiles,
        });

        navigate(paths.shared.imprest);
    };

    const handlePondProcess = (items: any[]) => {
        setPondFiles(items.map(fi => fi.file).filter(Boolean));
    };

    const isPending = createMutation.isPending;

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
                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Category — always shown */}
                                <SelectField
                                    control={control}
                                    name="categoryId"
                                    label="Select Category"
                                    placeholder="-- Select Category --"
                                    options={imprestCategories.map(i => ({
                                        id: String(i.id),
                                        name: i.name,
                                    }))}
                                />

                                {/* Party Name — hidden in transfer mode */}
                                {!isTransferMode && (
                                    <div className="space-y-2">
                                        <Label>Party Name</Label>
                                        <Input placeholder="Party Name" {...register("partyName")} />
                                        {errors.partyName && <p className="text-sm text-red-600">{errors.partyName.message}</p>}
                                    </div>
                                )}

                                {/* Project — hidden in transfer mode */}
                                {!isTransferMode && (
                                    <SelectField control={control} name="projectName" label="Select Project" placeholder="-- Select Project --" options={projectOptions} />
                                )}

                                {/* Transfer To — only shown in transfer mode */}
                                {isTransferMode && (
                                    <div className="space-y-2">
                                        <SelectInput
                                            label="Transfer To"
                                            placeholder="-- Select Team Member --"
                                            value={selectedTransferUserId}
                                            options={transferUserOptions}
                                            onChange={val => {
                                                setSelectedTransferUserId(val);
                                                if (val) setTransferUserError("");
                                            }}
                                        />
                                        {transferUserError && <p className="text-sm text-red-600">{transferUserError}</p>}
                                    </div>
                                )}

                                {/* Amount — always shown */}
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input type="number" placeholder="Amount" {...register("amount")} />
                                    {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
                                </div>

                                {/* File upload — always shown */}
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
                                            "text/plain",
                                        ]}
                                    />
                                </div>

                                {/* Remarks — always shown */}
                                <div className="space-y-2 lg:col-span-3">
                                    <Label>Remarks</Label>
                                    <Textarea rows={4} {...register("remark")} />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Submitting…" : "Submit"}
                                </Button>
                            </div>
                        </form>
                    </FormProvider>
                </CardContent>
            </Card>
        </div>
    );
};

export default EmployeeImprestForm;
