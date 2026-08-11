import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateImprest, useUpdateImprest, useUploadImprestProofs } from "@/hooks/api/imprest.hooks";
import { useImprestCategories } from "@/hooks/api/useImprestCategories";
import { useUsers } from "@/hooks/api/useUsers";
import { useProjectOptions } from "@/hooks/useSelectOptions";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import type { FilePondFile } from "filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { imprestFormSchema, type ImprestFormValues } from "../helpers/imprest.schema";
import type { ImprestRow } from "../helpers/imprest.types";

registerPlugin(FilePondPluginFileValidateType, FilePondPluginImagePreview);

const TEAM_MEMBER_CATEGORY_ID = 22;
const toTitleCase = (name: string): string => name.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

interface ImprestFormProps {
    imprest?: ImprestRow | null;
    mode: "create" | "edit";
}

export function ImprestForm({ imprest, mode }: ImprestFormProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: imprestCategories = [] } = useImprestCategories();
    const { data: allUsers = [] } = useUsers();
    const projectOptions = useProjectOptions();

    const createMutation = useCreateImprest();
    const updateMutation = useUpdateImprest();
    const uploadMutation = useUploadImprestProofs();
    const [pondFiles, setPondFiles] = useState<File[]>([]);

    const categoryOptions = imprestCategories.map(i => ({
        id: String(i.id),
        name: i.name,
    }));

    const userOptions = allUsers
        .filter(u => u.isActive === true)
        .map(u => ({
            id: String(u.id),
            name: toTitleCase(u.name || ""),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const form = useForm<ImprestFormValues>({
        resolver: zodResolver(imprestFormSchema) as unknown as Resolver<ImprestFormValues>,
        defaultValues: {
            userId: undefined,
            categoryId: undefined,
            partyName: null,
            projectName: null,
            transferToId: null,
            amount: undefined,
            dateOfExpense: undefined,
            remark: "",
        },
    });

    const watchedCategoryId = form.watch("categoryId");
    const isTransferMode = Number(watchedCategoryId) === TEAM_MEMBER_CATEGORY_ID;

    const excludeUserId = String(mode === "create" ? (user?.id ?? -1) : (imprest?.userId ?? -1));
    const transferUserOptions = userOptions.filter(u => u.id !== excludeUserId);

    useEffect(() => {
        if (mode === "create" && user?.id) {
            form.setValue("userId", user.id);
        }
    }, [mode, user, form]);

    useEffect(() => {
        if (mode === "create") {
            form.setValue("transferToId", null, { shouldValidate: false });
        }
    }, [watchedCategoryId, mode, form]);

    useEffect(() => {
        if (mode !== "edit" || !imprest) return;

        form.reset({
            userId: imprest.userId,
            categoryId: imprest.categoryId ?? undefined,
            partyName: imprest.partyName,
            projectName: imprest.projectName,
            transferToId: imprest.teamId,
            amount: imprest.amount,
            dateOfExpense: imprest.dateOfExpense ? new Date(imprest.dateOfExpense) : undefined,
            remark: imprest.remark || "",
        });
    }, [imprest, mode, form]);

    const imprestId = imprest?.id ?? 0;

    const handlePondProcess = (items: FilePondFile[]) => {
        setPondFiles(items.map(fi => fi.file as File));
    };

    const handleSubmit = async (data: ImprestFormValues) => {
        if (mode === "edit" && imprest) {
            await updateMutation.mutateAsync({
                id: imprestId,
                data: {
                    userId: data.userId,
                    categoryId: data.categoryId,
                    partyName: data.partyName,
                    projectName: data.projectName,
                    teamId: isTransferMode ? data.transferToId : null,
                    amount: data.amount,
                    dateOfExpense: data.dateOfExpense instanceof Date ? format(data.dateOfExpense, "yyyy-MM-dd") : data.dateOfExpense,
                    remark: data.remark,
                    approvalStatus: imprest.approvalStatus,
                    approvedDate: imprest.approvedDate,
                },
            });

            if (pondFiles.length > 0) {
                await uploadMutation.mutateAsync({
                    id: imprestId,
                    files: pondFiles,
                });
            }

            if (imprest.userId) {
                navigate(paths.shared.imprestUser(imprest.userId));
            } else {
                navigate(paths.accounts.imprests);
            }
        } else {
            await createMutation.mutateAsync({
                data: {
                    ...data,
                    transferToId: isTransferMode ? data.transferToId : null,
                },
                files: pondFiles,
            });

            navigate(paths.shared.imprest);
        }
    };

    const isPending =
        (mode === "create" && createMutation.isPending) ||
        (mode === "edit" && (updateMutation.isPending || uploadMutation.isPending));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === "create" ? "Add Employee Imprest" : `Edit Imprest #${imprestId}`}</CardTitle>
                <CardAction>
                    <Button
                        variant="outline"
                        onClick={() =>
                            imprest?.userId
                                ? navigate(paths.shared.imprestUser(imprest.userId))
                                : navigate(paths.shared.imprest)
                        }
                    >
                        <User className="h-4 w-4 mr-1" />
                        Return Back
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Category — always shown */}
                            <SelectField
                                control={form.control}
                                name="categoryId"
                                label="Select Category"
                                placeholder="-- Select Category --"
                                options={categoryOptions}
                            />

                            {/* Assigned To — disabled in create (auto = current user) */}
                            <SelectField
                                control={form.control}
                                name="userId"
                                label="Assigned To"
                                placeholder="-- Select User --"
                                options={userOptions}
                                disabled={mode === "create"}
                            />

                            {/* Party Name — hidden in transfer mode */}
                            {!isTransferMode && (
                                <FieldWrapper<ImprestFormValues, "partyName">
                                    control={form.control}
                                    name="partyName"
                                    label="Party Name"
                                >
                                    {field => <Input placeholder="Party Name" {...field} value={field.value ?? ""} />}
                                </FieldWrapper>
                            )}

                            {/* Project — hidden in transfer mode */}
                            {!isTransferMode && (
                                <SelectField
                                    control={form.control}
                                    name="projectName"
                                    label="Select Project"
                                    placeholder="-- Select Project --"
                                    options={projectOptions}
                                />
                            )}

                            {/* Transfer To — only shown in transfer mode */}
                            {isTransferMode && (
                                <SelectField
                                    control={form.control}
                                    name="transferToId"
                                    label="Transfer To"
                                    placeholder="-- Select Team Member --"
                                    options={transferUserOptions}
                                />
                            )}

                            {/* Amount — always shown */}
                            <FieldWrapper<ImprestFormValues, "amount">
                                control={form.control}
                                name="amount"
                                label="Amount"
                            >
                                {field => <NumberInput placeholder="Amount" value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>

                            {/* Date of Expense — always shown */}
                            <FieldWrapper<ImprestFormValues, "dateOfExpense">
                                control={form.control}
                                name="dateOfExpense"
                                label="Date of Expense"
                            >
                                {field => (
                                    <DateInput
                                        value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd") : (field.value ?? "")}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>

                            {/* Proofs — always shown */}
                            <div className="space-y-3 md:col-span-1">
                                <div className="space-y-2">
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
                                        labelIdle='Drag & drop files or <span class="filepond--label-action">Browse</span>'
                                        className="cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Remarks — always shown (optional) */}
                            <FieldWrapper<ImprestFormValues, "remark">
                                control={form.control}
                                name="remark"
                                label="Remarks"
                                className="md:col-span-1"
                            >
                                {field => (
                                    <textarea
                                        className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        placeholder="Remarks (optional)"
                                        {...field}
                                        value={field.value ?? ""}
                                    />
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="w-full flex items-center justify-center gap-2">
                            <Button type="submit" disabled={isPending}>
                                {isPending
                                    ? "Saving..."
                                    : mode === "create"
                                        ? "Create Imprest"
                                        : "Save Changes"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isPending}>
                                Reset
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.shared.imprest)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}