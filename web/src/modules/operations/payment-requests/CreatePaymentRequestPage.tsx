import { paths } from "@/app/routes/paths";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBeneficiaries, useCreateBeneficiary, useCreatePaymentRequest, useNextPRNumber } from "@/hooks/api/useProjectPaymentRequests";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { purchaseInvoiceApi } from "@/services/api/purchase-invoice.api";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Hash, Landmark, Loader2, Plus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PaymentAgainstField } from "./components/PaymentAgainstField";
import { mapPaymentRequestFormToCreateDTO } from "./helpers/paymentRequest.mapper";
import { paymentRequestFormSchema, type PaymentRequestFormValues } from "./helpers/paymentRequest.schema";

const defaultFormValues: PaymentRequestFormValues = {
    selectedBeneficiaryId: "",
    partyName: "",
    accountNumber: "",
    bankName: "",
    ifsc: "",
    amount: null,
    paymentAgainst: "",
    uploadedInvoiceFile: [],
    poFile: [],
    remark: "",
    pi_category: "",
    pi_partyName: "",
    pi_valuePreGst: null,
    pi_gstAmount: null,
    pi_invoiceDate: "",
    pi_invoiceFile: [],
};

export default function CreatePaymentRequestPage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const projectId = Number(projectIdParam);

    const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
    const projectName = overview?.project?.projectName;
    const { data: nextPRNumber, isLoading: isLoadingPRNumber } = useNextPRNumber(projectName);

    const { data: beneficiaries } = useBeneficiaries();
    const createBeneficiaryMutation = useCreateBeneficiary();
    const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false);
    const [newBeneficiary, setNewBeneficiary] = useState({ name: "", accountNumber: "", ifsc: "", bankName: "" });

    const form = useForm<PaymentRequestFormValues>({
        resolver: zodResolver(paymentRequestFormSchema) as any,
        defaultValues: defaultFormValues,
    });

    const selectedBeneficiaryId = form.watch("selectedBeneficiaryId");

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

    const handleAddBeneficiary = async () => {
        try {
            const created = await createBeneficiaryMutation.mutateAsync(newBeneficiary);
            form.setValue("selectedBeneficiaryId", String(created.id));
            setNewBeneficiary({ name: "", accountNumber: "", ifsc: "", bankName: "" });
            setIsAddBeneficiaryOpen(false);
            toast.success("Beneficiary added successfully");
        } catch {
            toast.error("Failed to add beneficiary");
        }
    };

    const createPRMutation = useCreatePaymentRequest();

    const handleSubmit = async (values: PaymentRequestFormValues) => {
        try {
            const prData = mapPaymentRequestFormToCreateDTO(values, projectId, projectName);

            if (values.paymentAgainst === "new_pi") {
                const pi = await purchaseInvoiceApi.create({
                    projectId,
                    projectName: projectName || undefined,
                    category: values.pi_category,
                    partyName: values.pi_partyName,
                    valuePreGst: values.pi_valuePreGst!,
                    gstAmount: values.pi_gstAmount!,
                    invoiceDate: values.pi_invoiceDate,
                    invoiceFile: values.pi_invoiceFile?.[0],
                });
                prData.purchaseInvoiceId = pi.id;
            }

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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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


                        <div className="border rounded-lg border-dashed p-4 space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Landmark className="h-5 w-5" />
                                Bank Details
                            </h3>
                            <div className="flex items-end gap-4">
                                <SelectField
                                    control={form.control}
                                    name="selectedBeneficiaryId"
                                    label="Beneficiary (Master)"
                                    options={beneficiaryOptions}
                                    placeholder="Select beneficiary..."
                                />
                                <Dialog open={isAddBeneficiaryOpen} onOpenChange={setIsAddBeneficiaryOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" type="button" className="mb-1">
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Add New
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New Beneficiary</DialogTitle>
                                            <DialogDescription>Save beneficiary bank details for future use</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-1">
                                                <Label>Beneficiary Name <span className="text-destructive">*</span></Label>
                                                <Input
                                                    value={newBeneficiary.name}
                                                    onChange={(e) => setNewBeneficiary(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Enter beneficiary name"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Account Number <span className="text-destructive">*</span></Label>
                                                <Input
                                                    value={newBeneficiary.accountNumber}
                                                    onChange={(e) => setNewBeneficiary(prev => ({ ...prev, accountNumber: e.target.value }))}
                                                    placeholder="Enter account number"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>IFSC Code <span className="text-destructive">*</span></Label>
                                                <Input
                                                    value={newBeneficiary.ifsc}
                                                    onChange={(e) => setNewBeneficiary(prev => ({ ...prev, ifsc: e.target.value.toUpperCase() }))}
                                                    placeholder="e.g. SBIN0001234"
                                                    className="font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Bank Name</Label>
                                                <Input
                                                    value={newBeneficiary.bankName}
                                                    onChange={(e) => setNewBeneficiary(prev => ({ ...prev, bankName: e.target.value }))}
                                                    placeholder="e.g. State Bank of India"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" type="button" onClick={() => setIsAddBeneficiaryOpen(false)}>Cancel</Button>
                                            <Button type="button" onClick={handleAddBeneficiary} disabled={!newBeneficiary.name || !newBeneficiary.accountNumber || !newBeneficiary.ifsc}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            </div>
                        </div>

                        <div className="border rounded-lg border-dashed p-4 space-y-4">
                            <PaymentAgainstField control={form.control} />
                        </div>

                        <div className="flex items-end justify-end">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="min-w-[160px]" disabled={createPRMutation.isPending}>
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
