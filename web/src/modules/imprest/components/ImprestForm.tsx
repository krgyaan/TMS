import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { FileUploader } from "@/components/file-upload";
import { AlertCircle, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { imprestFormSchema, INSURANCE_CATEGORY_ID, type ImprestFormValues } from "../helpers/imprest.schema";
import type { ImprestRow } from "../helpers/imprest.types";
import { InsuranceDetailsForm } from "@/modules/insurance/components/InsuranceDetailsForm";
import { buildInsurancePayload } from "@/modules/insurance/helpers/insurance.mapper";

const TEAM_MEMBER_CATEGORY_ID = 22;
const toTitleCase = (name: string): string => name.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

interface ImprestFormProps {
    imprest?: ImprestRow | null;
    mode: "create" | "edit";
}

export function ImprestForm({ imprest, mode }: ImprestFormProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { data: imprestCategories = [] } = useImprestCategories();
    const { data: allUsers = [] } = useUsers();
    const projectOptions = useProjectOptions();
    const isAccountsSection = location.pathname.includes("/accounts/");

    const createMutation = useCreateImprest();
    const updateMutation = useUpdateImprest();
    const uploadMutation = useUploadImprestProofs();
const [files, setFiles] = useState<string[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);

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
            insuranceType: null,
            policyNumber: null,
            insurerName: null,
            startDate: null,
            endDate: null,
            policyDocument: [],
            sumAssured: null,
            noOfManpower: null,
            manpowerNames: null,
            location: null,
            itemsCovered: null,
            lrCopy: [],
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
            insuranceType: imprest.insurancePolicy?.insuranceType ?? null,
            policyNumber: imprest.insurancePolicy?.policyNumber ?? null,
            insurerName: imprest.insurancePolicy?.insurerName ?? null,
            startDate: imprest.insurancePolicy?.startDate ?? null,
            endDate: imprest.insurancePolicy?.endDate ?? null,
            policyDocument: imprest.insurancePolicy?.policyDocument ?? [],
            sumAssured: imprest.insurancePolicy?.sumAssured ? Number(imprest.insurancePolicy.sumAssured) : null,
            noOfManpower: imprest.insurancePolicy?.noOfManpower ?? null,
            manpowerNames: imprest.insurancePolicy?.manpowerNames ?? null,
            location: imprest.insurancePolicy?.location ?? null,
            itemsCovered: imprest.insurancePolicy?.itemsCovered ?? null,
            lrCopy: imprest.insurancePolicy?.lrCopy ?? [],
        });
    }, [imprest, mode, form]);

    useEffect(() => {
        if (!submitError) return;

        const subscription = form.watch(() => setSubmitError(null));
        return () => subscription.unsubscribe();
    }, [form, submitError]);

    const imprestId = imprest?.id ?? 0;

    const extractServerError = (err: unknown): string => {
        const ax = err as { response?: { status?: number; data?: { message?: string | string[] } } };
        const status = ax?.response?.status;
        const raw = ax?.response?.data?.message;
        const text = Array.isArray(raw) ? raw.filter(Boolean).join(", ") : raw ?? "";

        if (status === 403 && /locked|approved by accounts/i.test(text)) {
            form.setError("dateOfExpense", { message: "This expense week is locked." });
            return `This expense week is locked — accounts has already approved the voucher. ${text}`;
        }
        if (status === 409) {
            return `Voucher amount mismatch — please refresh the voucher view. ${text}`;
        }
        if (status === 400 && /cannot create an already-approved/i.test(text)) {
            return "Use the Approve button after saving.";
        }

        return text || "Failed to save imprest. Please try again.";
    };

    const handleSubmit = async (data: ImprestFormValues) => {
        setSubmitError(null);
        try {
            const insurancePayload = buildInsurancePayload(data);
            const insurance = insurancePayload ? JSON.stringify(insurancePayload) : null;

            if (mode === "edit" && imprest) {
                await updateMutation.mutateAsync({
                    id: imprestId,
                    data: {
                        userId: data.userId,
                        categoryId: data.categoryId,
                        partyName: isTransferMode ? null : data.partyName,
                        projectName: isTransferMode ? null : data.projectName,
                        teamId: isTransferMode ? data.transferToId : null,
                        amount: data.amount,
                        dateOfExpense: data.dateOfExpense instanceof Date ? format(data.dateOfExpense, "yyyy-MM-dd") : data.dateOfExpense,
                        remark: data.remark,
                        approvalStatus: imprest.approvalStatus,
                        approvedDate: imprest.approvedDate,
                        insurance,
                    },
                });

                if (files.length > 0) {
                    await uploadMutation.mutateAsync({
                        id: imprestId,
                        filenames: files,
                    });
                }

                if (imprest.userId) {
                    navigate(isAccountsSection ? paths.accounts.imprestsUserView(imprest.userId) : paths.shared.imprestUser(imprest.userId));
                } else {
                    navigate(isAccountsSection ? paths.accounts.imprests : paths.shared.imprest);
                }
            } else {
                await createMutation.mutateAsync({
                    data: {
                        ...data,
                        transferToId: isTransferMode ? data.transferToId : null,
                        insurance,
                    },
                    filenames: files,
                });

                navigate(isAccountsSection ? paths.accounts.imprests : paths.shared.imprest);
            }
        } catch (err) {
            setSubmitError(extractServerError(err));
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
                                ? navigate(isAccountsSection ? paths.accounts.imprestsUserView(imprest.userId) : paths.shared.imprestUser(imprest.userId))
                                : navigate(isAccountsSection ? paths.accounts.imprests : paths.shared.imprest)
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
                        {submitError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Unable to Save</AlertTitle>
                                <AlertDescription>{submitError}</AlertDescription>
                            </Alert>
                        )}

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
                                    <FileUploader
                                        context="employee-imprest"
                                        value={files}
                                        onChange={setFiles}
                                    />
                                </div>
                            </div>

                            {/* Remarks — always shown (required) */}
                            <FieldWrapper<ImprestFormValues, "remark">
                                control={form.control}
                                name="remark"
                                label="Remarks"
                                className="md:col-span-1"
                            >
                                {field => (
                                    <textarea
                                        className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        placeholder="Enter remark"
                                        {...field}
                                        value={field.value ?? ""}
                                        required
                                    />
                                )}
                            </FieldWrapper>
                        </div>

                        {/* Insurance Details — only for Insurance Charges category */}
                        {Number(watchedCategoryId) === INSURANCE_CATEGORY_ID && <InsuranceDetailsForm />}

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
                                onClick={() => navigate(isAccountsSection ? paths.accounts.imprests : paths.shared.imprest)}
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