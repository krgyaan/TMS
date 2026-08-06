import { paths } from "@/app/routes/paths";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useBeneficiaries, useCreateBeneficiary, useCreatePaymentRequest, useNextPRNumber } from "@/hooks/api/useProjectPaymentRequests";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatINR } from "@/hooks/useINRFormatter";
import { ArrowLeft, Building2, Hash, Loader2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PaymentAgainstField } from "./components/PaymentAgainstField";
import { BeneficiaryFormDialog } from "@/modules/operations/vendor-master/components/BeneficiaryFormDialog";
import type { BeneficiaryFormValues } from "@/modules/operations/vendor-master/vendor-master.types";
import { mapPaymentRequestFormToCreateDTO } from "./helpers/paymentRequest.mapper";
import { paymentRequestFormSchema, type PaymentRequestFormValues } from "./helpers/paymentRequest.schema";

const defaultFormValues: PaymentRequestFormValues = {
    selectedBeneficiaryId: "",
    paymentMode: "BANK_TRANSFER",
    portalLink: "",
    partyName: "",
    accountNumber: "",
    bankName: "",
    ifsc: "",
    amount: null,
    selectedPoId: "",
    selectedVwoId: "",
    paymentAgainst: "",
    poFile: [],
    remark: "",
};

export default function CreatePaymentRequestPage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const projectId = Number(projectIdParam);
    const [searchParams] = useSearchParams();
    const poIdParam = searchParams.get("poId");
    const vwoIdParam = searchParams.get("vwoId");

    const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
    const projectName = overview?.project?.projectName;
    const { data: nextPRNumber, isLoading: isLoadingPRNumber } = useNextPRNumber(projectName);

    const { data: beneficiaries } = useBeneficiaries();
    const createBeneficiaryMutation = useCreateBeneficiary();
    const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false);

    const preSelectedPoId = poIdParam ? Number(poIdParam) : undefined;
    const preSelectedVwoId = vwoIdParam ? Number(vwoIdParam) : undefined;
    const [remainingAmount, setRemainingAmount] = useState(0);

    const onRemainingChange = useCallback((remaining: number) => {
        setRemainingAmount(remaining);
    }, []);

    const form = useForm<PaymentRequestFormValues>({
        resolver: zodResolver(paymentRequestFormSchema) as any,
        defaultValues: {
            ...defaultFormValues,
            paymentAgainst: poIdParam ? "po" : vwoIdParam ? "vwo" : "",
            selectedPoId: poIdParam || "",
            selectedVwoId: vwoIdParam || "",
        },
    });

    const selectedBeneficiaryId = form.watch("selectedBeneficiaryId");
    const paymentMode = form.watch("paymentMode");

    useEffect(() => {
        if (!selectedBeneficiaryId || !beneficiaries) return;
        const ben = beneficiaries.find((b: any) => String(b.id) === selectedBeneficiaryId);
        if (!ben) return;
        form.setValue("partyName", ben.name || "");
        form.setValue("accountNumber", ben.accountNumber || "");
        form.setValue("bankName", ben.bankName || "");
        form.setValue("ifsc", ben.ifsc || "");
    }, [selectedBeneficiaryId, beneficiaries, form]);

    const beneficiaryOptions = (beneficiaries || []).map((b: any) => ({
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

    const createPRMutation = useCreatePaymentRequest();

    const handleSubmit = async (values: PaymentRequestFormValues) => {
        try {
            if (values.paymentAgainst === "po" && values.amount != null && remainingAmount > 0 && values.amount > remainingAmount) {
                form.setError("amount", { message: `Amount exceeds remaining PO balance (${formatINR(remainingAmount)})` });
                return;
            }
            if (values.paymentAgainst === "vwo" && values.amount != null && remainingAmount > 0 && values.amount > remainingAmount) {
                form.setError("amount", { message: `Amount exceeds remaining Work Order balance (${formatINR(remainingAmount)})` });
                return;
            }

            const prData = mapPaymentRequestFormToCreateDTO(values, projectId, projectName);

            const result = await createPRMutation.mutateAsync(prData);
            toast.success(`Payment Request #${result.requestNo} created successfully.`);
            navigate(paths.operations.projectDashboard(projectId));
        } catch {
            toast.error("Failed to create payment request. Please try again.");
        }
    };

    if (isProjectLoading) {
        return (
            <div className="container mx-auto py-6 max-w-4xl">
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Raise Payment Request</CardTitle>
                        <CardDescription className="mt-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline">
                                    {overview?.tender?.tenderNumber || "N/A"}
                                </Badge>
                                <Badge variant="secondary">
                                    {overview?.project?.projectName || "N/A"}
                                </Badge>
                            </div>
                        </CardDescription>
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
                        <div className="hidden">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    Request Number
                                </Label>
                                <Input value={isLoadingPRNumber ? "Loading..." : nextPRNumber} readOnly className="bg-muted font-mono" />
                                <p className="text-xs text-muted-foreground">Preview — final number assigned upon creation</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Project Name
                                </Label>
                                <Input value={overview?.project?.projectName || ""} readOnly className="bg-muted" />
                            </div>
                        </div>
                        <RadioGroup
                            value={paymentMode}
                            onValueChange={(v) => form.setValue("paymentMode", v as "BANK_TRANSFER" | "PORTAL")}
                            className="flex gap-6"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="BANK_TRANSFER" id="bank-transfer" />
                                <Label htmlFor="bank-transfer" className="cursor-pointer">Bank Transfer</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="PORTAL" id="pay-on-portal" />
                                <Label htmlFor="pay-on-portal" className="cursor-pointer">Pay on Portal</Label>
                            </div>
                        </RadioGroup>
                        <div className="border rounded-lg border-dashed p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                            {paymentMode === "BANK_TRANSFER" && (
                                <>
                                    <div className="col-span-4">
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
                                            <BeneficiaryFormDialog
                                                open={isAddBeneficiaryOpen}
                                                onOpenChange={setIsAddBeneficiaryOpen}
                                                onSubmit={handleAddBeneficiary}
                                                isLoading={createBeneficiaryMutation.isPending}
                                            />
                                        </div>
                                    </div>
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
                                </>
                            )}

                            {paymentMode === "PORTAL" && (
                                <FieldWrapper control={form.control} name="portalLink" label="Portal URL">
                                    {(field) => <Input {...field} placeholder="Enter portal payment link..." />}
                                </FieldWrapper>
                            )}

                            <FieldWrapper control={form.control} name="amount" label={<>Amount <span className="text-destructive">*</span></>}>
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
                            <div className="col-span-3">
                                <PaymentAgainstField control={form.control} projectId={projectId} preSelectedPoId={preSelectedPoId} preSelectedVwoId={preSelectedVwoId} onRemainingChange={onRemainingChange} />
                            </div>
                        </div>


                        <div className="flex items-end justify-between">
                            <div>
                                {(remainingAmount <= 0 && (poIdParam || vwoIdParam)) && (
                                    <p className="text-destructive text-sm font-medium">
                                        This {poIdParam ? "PO" : "Work Order"} has no remaining balance. Payment request cannot be created.
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="min-w-40" disabled={createPRMutation.isPending || (remainingAmount <= 0 && (!!poIdParam || !!vwoIdParam))}>
                                    {createPRMutation.isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                                    ) : (
                                        "Create Request"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
