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
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useImprestCategories } from "@/hooks/api/useImprestCategories";
import { useAuth } from "@/contexts/AuthContext";

registerPlugin(FilePondPluginFileValidateType, FilePondPluginImagePreview);

const EmployeeImprestForm: React.FC = () => {
    const navigate = useNavigate();
    const { data: projects = [] } = useProjectsMaster();
    const { data: imprestCategories = [] } = useImprestCategories();
    const { user } = useAuth();

    const [pondFiles, setPondFiles] = useState<File[]>([]);
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
    } = methods;

    // ✅ ensure userId is set once user loads
    useEffect(() => {
        if (user?.id) {
            setValue("userId", user.id);
        }
    }, [user, setValue]);

    const onSubmit = async (data: CreateImprestInput) => {
        await createMutation.mutateAsync({ data, files: pondFiles });
        navigate(paths.shared.imprest);
    };

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
                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Party Name */}
                                <div className="space-y-2">
                                    <Label>Party Name</Label>
                                    <Input placeholder="Party Name" {...register("partyName")} />
                                    {errors.partyName && <p className="text-sm text-red-600">{errors.partyName.message}</p>}
                                </div>

                                {/* Project Select (string) */}
                                <SelectField
                                    control={control}
                                    name="projectName"
                                    label="Select Project"
                                    placeholder="-- Select Project --"
                                    options={projects.map(p => ({
                                        id: p.projectName, // string goes directly into projectName
                                        name: p.projectName,
                                    }))}
                                />

                                {/* Amount */}
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input type="number" placeholder="Amount" {...register("amount")} />
                                    {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
                                </div>

                                {/* Category Select (number) */}
                                <SelectField
                                    control={control}
                                    name="categoryId"
                                    label="Select Category"
                                    placeholder="-- Select Category --"
                                    options={imprestCategories.map(i => ({
                                        id: String(i.id), // SelectField gives string → zod coerces to number
                                        name: i.name,
                                    }))}
                                />

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
                    </FormProvider>
                </CardContent>
            </Card>
        </div>
    );
};

export default EmployeeImprestForm;
