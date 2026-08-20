import { paths } from "@/app/routes/paths";
import { SelectField } from "@/components/form/SelectField";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileUploader } from "@/components/file-upload";
import { useBeneficiaries, useCreateBeneficiary } from "@/hooks/api/useProjectPaymentRequests";
import { useCreateProjectInsurance } from "@/hooks/api/useProjectInsurance";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BeneficiaryFormDialog } from "@/modules/operations/vendor-master/components/BeneficiaryFormDialog";
import type { BeneficiaryFormValues } from "@/modules/operations/vendor-master/vendor-master.types";
import { InsuranceDetailsForm } from "@/modules/insurance/components/InsuranceDetailsForm";
import { projectInsuranceDefaultValues, projectInsuranceFormSchema, type ProjectInsuranceFormValues } from "../helpers/projectInsurance.schema";
import { mapProjectInsuranceFormToCreateDTO } from "../helpers/projectInsurance.mapper";

export default function CreateProjectInsurancePage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const [searchParams] = useSearchParams();
    const projectId = Number(projectIdParam);
    const insurancePolicyId = searchParams.get("policyId") ? Number(searchParams.get("policyId")) : null;
    const isRenewal = insurancePolicyId != null && !Number.isNaN(insurancePolicyId);

    const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
    const projectName = overview?.project?.projectName;

    const createMutation = useCreateProjectInsurance();
    const { data: beneficiaries } = useBeneficiaries();
    const createBeneficiaryMutation = useCreateBeneficiary();
    const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false);

    const form = useForm<ProjectInsuranceFormValues>({
        resolver: zodResolver(projectInsuranceFormSchema) as never,
        defaultValues: projectInsuranceDefaultValues,
    });

    const selectedBeneficiaryId = form.watch("selectedBeneficiaryId");
    const paymentMode = form.watch("paymentMode");

    useEffect(() => {
        if (!selectedBeneficiaryId || !beneficiaries) return;
        const ben = beneficiaries.find((b: { id: number; name?: string; accountNumber?: string; bankName?: string; ifsc?: string }) =>
            String(b.id) === selectedBeneficiaryId
        );
        if (!ben) return;
        form.setValue("partyName", ben.name || "");
        form.setValue("accountNumber", ben.accountNumber || "");
        form.setValue("bankName", ben.bankName || "");
        form.setValue("ifsc", ben.ifsc || "");
    }, [selectedBeneficiaryId, beneficiaries, form]);

    const beneficiaryOptions = (beneficiaries || []).map((b: { id: number; name?: string; accountNumber?: string }) => ({
        id: String(b.id),
        name: `${b.name} (${b.accountNumber})`,
    }));

    const handleAddBeneficiary = async (values: BeneficiaryFormValues) => {
        try {
            const created = await createBeneficiaryMutation.mutateAsync(values);
            form.setValue("selectedBeneficiaryId", String(created.id));
            setIsAddBeneficiaryOpen(false);
            toast.success("Beneficiary added successfully");
        } catch {
            toast.error("Failed to add beneficiary");
        }
    };

    const handleSubmit = async (values: ProjectInsuranceFormValues) => {
        try {
            const dto = mapProjectInsuranceFormToCreateDTO(values, projectId, projectName, isRenewal ? insurancePolicyId : null);
            const result = await createMutation.mutateAsync(dto);
            if (isRenewal) {
                toast.success(`Renewal payment raised. Request #${result.requestNo} linked to Policy #${insurancePolicyId}.`);
            } else {
                toast.success(`Insurance added. Payment Request #${result.requestNo} raised automatically.`);
            }
            navigate(paths.operations.projectDashboard(projectId));
        } catch {
            toast.error("Failed to add insurance. Please try again.");
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        {isRenewal ? (
                            <>
                                <CardTitle>Renew Insurance Policy #{insurancePolicyId}</CardTitle>
                                <CardDescription className="mt-2">
                                    Raise another payment against the existing policy. A project payment request will be raised and linked to Policy #{insurancePolicyId}.
                                    <div className="flex items-center gap-3 mt-2">
                                        <Badge variant="outline">
                                            {overview?.tender?.tenderNumber || "N/A"}
                                        </Badge>
                                        <Badge variant="secondary">
                                            {overview?.project?.projectName || "N/A"}
                                        </Badge>
                                    </div>
                                </CardDescription>
                            </>
                        ) : (
                            <>
                                <CardTitle>Add Project Insurance</CardTitle>
                                <CardDescription className="mt-2">
                                    Add insurance for this project. A project payment request will be raised automatically.
                                    <div className="flex items-center gap-3 mt-2">
                                        <Badge variant="outline">
                                            {overview?.tender?.tenderNumber || "N/A"}
                                        </Badge>
                                        <Badge variant="secondary">
                                            {overview?.project?.projectName || "N/A"}
                                        </Badge>
                                    </div>
                                </CardDescription>
                            </>
                        )}
                    </div>
                    <CardAction>
                        <Button variant="outline" size="sm" type="button" onClick={() => navigate(-1)} className="flex items-center space-x-2">
                            <ArrowLeft className="h-4 w-4" />
                            <span>Go Back</span>
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <InsuranceDetailsForm />

                        <div className="border rounded-lg border-dashed p-4 space-y-4">
                            <h3 className="text-lg font-semibold">Payment Details</h3>
                            <RadioGroup
                                value={paymentMode}
                                onValueChange={(v) => form.setValue("paymentMode", v as "BANK_TRANSFER" | "PORTAL")}
                                className="flex gap-6"
                            >
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="BANK_TRANSFER" id="insurance-bank-transfer" />
                                    <Label htmlFor="insurance-bank-transfer" className="cursor-pointer">Bank Transfer</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="PORTAL" id="insurance-pay-on-portal" />
                                    <Label htmlFor="insurance-pay-on-portal" className="cursor-pointer">Pay on Portal</Label>
                                </div>
                            </RadioGroup>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                {paymentMode === "BANK_TRANSFER" && (
                                    <div className="col-span-4 space-y-4">
                                        <div className="flex items-end gap-4">
                                            <SelectField
                                                control={form.control}
                                                name="selectedBeneficiaryId"
                                                label="Beneficiary (Master)"
                                                options={beneficiaryOptions}
                                                placeholder="Select beneficiary..."
                                            />
                                            <Button variant="outline" size="sm" type="button" className="mb-1" onClick={() => setIsAddBeneficiaryOpen(true)}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add New
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <FieldWrapper control={form.control} name="partyName" label={<>Party Name <span className="text-destructive">*</span></>}>
                                                {(field) => <Input {...field} placeholder="Enter party name" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="accountNumber" label={<>Account Number <span className="text-destructive">*</span></>}>
                                                {(field) => <Input {...field} placeholder="Enter account number" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="bankName" label="Bank Name">
                                                {(field) => <Input {...field} placeholder="e.g. State Bank of India" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="ifsc" label={<>IFSC <span className="text-destructive">*</span></>}>
                                                {(field) => (
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g. SBIN0001234"
                                                        className="font-mono"
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                )}
                                {paymentMode === "PORTAL" && (
                                    <FieldWrapper control={form.control} name="portalLink" label={<>Portal URL <span className="text-destructive">*</span></>}>
                                        {(field) => <Input {...field} placeholder="Enter portal payment link..." />}
                                    </FieldWrapper>
                                )}
                                <FieldWrapper control={form.control} name="amount" label={<>Premium Amount <span className="text-destructive">*</span></>}>
                                    {(field) => (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="remark" label="Remark (if any)">
                                    {(field) => <Input {...field} placeholder="Optional remarks" />}
                                </FieldWrapper>
                                <FileUploader
                                    label="Upload Bill"
                                    context="tender-documents"
                                    value={form.watch("billFiles")}
                                    onChange={(paths) => form.setValue("billFiles", paths)}
                                />
                            </div>
                        </div>

                        <div className="flex items-end justify-end">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="min-w-40" disabled={createMutation.isPending || isProjectLoading}>
                                    {createMutation.isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                                    ) : isRenewal ? (
                                        "Raise Renewal Payment"
                                    ) : (
                                        "Add Insurance & Raise Request"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>

            <BeneficiaryFormDialog
                open={isAddBeneficiaryOpen}
                onOpenChange={setIsAddBeneficiaryOpen}
                onSubmit={handleAddBeneficiary}
                isLoading={createBeneficiaryMutation.isPending}
            />
        </Card>
    );
}