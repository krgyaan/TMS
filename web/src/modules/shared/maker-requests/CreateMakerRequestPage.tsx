import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useBeneficiaries, useCreateBeneficiary } from "@/hooks/api/useProjectPaymentRequests";
import { useCreateMakerRequest } from "@/hooks/api/useMakerRequests";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Landmark, Loader2, Plus, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { paths } from "@/app/routes/paths";
import { makerRequestFormSchema, type MakerRequestFormValues } from "./helpers/makerRequest.schema";
import { mapMakerRequestFormToCreateDTO } from "./helpers/makerRequest.mapper";

const defaultFormValues: MakerRequestFormValues = {
    selectedHeading: "",
    categoryId: "",
    amount: null,
    paymentMode: "BANK_TRANSFER",
    selectedBeneficiaryId: "",
    partyName: "",
    accountNumber: "",
    ifsc: "",
    portalLink: "",
    billFiles: [],
    uploadInvoice: [],
    uploadPI: [],
    remark: "",
};

const headings = [
    {label: 'fixed', value: 'Fixed'},
    {label: 'loan_return', value: 'Loan Repayment/Return'},
    {label: 'own_bank', value: 'Own Bank'},
    {label: 'capital_asset_purchase', value: 'Capital/Asset Purchase'},
];

const fixedCategory = [
    {label: 'imprest', value: 'Imprest'},
    {label: 'communication', value: 'Communication'},
    {label: 'courier', value: 'Courier'},
    {label: 'electricity', value: 'Electricity'},
    {label: 'rent', value: 'Rent'},
    {label: 'emi', value: 'EMI'},
    {label: 'salary', value: 'Salary'},
    {label: 'software', value: 'Software'},
    {label: 'office_expenses', value: 'Office Expenses'},
    {label: 'printing_stationary', value: 'Printing & Stationary'},
    {label: 'office_maintenance', value: 'Office Maintenance'},
    {label: 'portal_renewal_charges', value: 'Portal Renewal Charges'},
    {label: 'professional_charges', value: 'Professional Charges'},
    {label: 'od_ac_interest', value: 'OD A/C Interest'},
];

const loanReturnCategory = [
    {label: 'related_party', value: 'Related Party'},
    {label: 'nbfc_oc_acc', value: 'NBFC OC Account'},
    {label: 'loan_principal_return', value: 'Loan Principal Return'},
];

const ownBankCategory = [
    {label: 'AU_5242', value: 'AU Current Account (AU_5242)'},
    {label: 'AU_5180', value: 'AU Inflow Account (AU_5180)'},
    {label: 'AU_5190', value: 'AU Expenses Account (AU_5190)'},
    {label: 'AU_8316', value: 'AU Outflow Account (AU_8316)'},
    {label: 'AU_9589', value: 'AU EMD Account (AU_9589)'},
    {label: 'AU_9284', value: 'AU Cash Reserve Account (AU_9284)'},
    {label: 'amex_cc', value: 'Amex Company Credit Card'},
];

const capitalAssetPurchaseCategory = [
    {label: 'investment', value: 'Investment'},
    {label: 'asset_purchase', value: 'Asset Purchase'},
];

const CATEGORY_UPLOAD_CONFIG: Record<string, { allowedUserIds?: number[]; uploadInvoice: boolean; uploadPI: boolean; uploadInvoiceAfterPayment: boolean }> = {
    imprest: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    communication: { uploadInvoice: true, uploadPI: false, uploadInvoiceAfterPayment: false },
    courier: { uploadInvoice: true, uploadPI: false, uploadInvoiceAfterPayment: false },
    electricity: { uploadInvoice: true, uploadPI: false, uploadInvoiceAfterPayment: false },
    rent: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: true },
    emi: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    salary: { allowedUserIds: [13, 7, 21, 42, 26], uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    software: { uploadInvoice: true, uploadPI: true, uploadInvoiceAfterPayment: true },
    office_expenses: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    printing_stationary: { uploadInvoice: true, uploadPI: true, uploadInvoiceAfterPayment: true },
    office_maintenance: { uploadInvoice: true, uploadPI: true, uploadInvoiceAfterPayment: true },
    portal_renewal_charges: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: true },
    professional_charges: { uploadInvoice: true, uploadPI: true, uploadInvoiceAfterPayment: true },
    related_party: { allowedUserIds: [13, 7, 21, 26], uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    nbfc_oc_acc: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    loan_principal_return: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    AU_5242: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    AU_5180: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    AU_5190: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    AU_8316: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    AU_9589: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    AU_9284: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    amex_cc: { uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    investment: { allowedUserIds: [13, 7, 21, 26], uploadInvoice: false, uploadPI: false, uploadInvoiceAfterPayment: false },
    asset_purchase: { uploadInvoice: false, uploadPI: true, uploadInvoiceAfterPayment: false },
};

export default function CreateMakerRequestPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: beneficiaries } = useBeneficiaries();
    const createMakerMutation = useCreateMakerRequest();
    const createBeneficiaryMutation = useCreateBeneficiary();

    const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false);
    const [newBeneficiary, setNewBeneficiary] = useState({ name: "", accountNumber: "", ifsc: "" });

    const form = useForm<MakerRequestFormValues>({
        resolver: zodResolver(makerRequestFormSchema) as any,
        defaultValues: defaultFormValues,
    });

    const selectedBeneficiaryId = form.watch("selectedBeneficiaryId");
    const paymentMode = form.watch("paymentMode");
    const selectedHeading = form.watch("selectedHeading");
    const categoryId = form.watch("categoryId");

    const headingOptions = useMemo(() => headings.map(h => ({ id: h.label, name: h.value })), []);

    const categoryOptions = useMemo(() => {
        if (!selectedHeading) return [];
        const map: Record<string, { label: string; value: string }[]> = {
            fixed: fixedCategory,
            loan_return: loanReturnCategory,
            own_bank: ownBankCategory,
            capital_asset_purchase: capitalAssetPurchaseCategory,
        };
        const cats = map[selectedHeading] || [];
        return cats.filter(c => {
            const config = CATEGORY_UPLOAD_CONFIG[c.label];
            if (config?.allowedUserIds && user?.id) {
                return config.allowedUserIds.includes(user.id);
            }
            return true;
        }).map(c => ({ id: c.label, name: c.value }));
    }, [selectedHeading, user?.id]);

    const selectedCategoryConfig = categoryId ? CATEGORY_UPLOAD_CONFIG[categoryId] : null;

    useEffect(() => {
        if (selectedHeading) {
            form.setValue("categoryId", "");
        }
    }, [selectedHeading, form]);

    useEffect(() => {
        if (!selectedBeneficiaryId || !beneficiaries) return;
        const ben = beneficiaries.find((b: any) => String(b.id) === selectedBeneficiaryId);
        if (!ben) return;
        form.setValue("partyName", ben.name || "");
        form.setValue("accountNumber", ben.accountNumber || "");
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
            setNewBeneficiary({ name: "", accountNumber: "", ifsc: "" });
            setIsAddBeneficiaryOpen(false);
            toast.success("Beneficiary added successfully");
        } catch {
            toast.error("Failed to add beneficiary");
        }
    };

    const handleSubmit = async (values: MakerRequestFormValues) => {
        try {
            const config = values.categoryId ? CATEGORY_UPLOAD_CONFIG[values.categoryId] : null;

            form.clearErrors("uploadInvoice");
            form.clearErrors("uploadPI");

            if (config) {
                const showInvoice = config.uploadInvoice;
                const showPI = config.uploadPI;
                const hasInvoice = (values.uploadInvoice?.length ?? 0) > 0;
                const hasPI = (values.uploadPI?.length ?? 0) > 0;

                if (showInvoice && showPI && !hasInvoice && !hasPI) {
                    form.setError("uploadInvoice", { message: "At least one of Upload Invoice or Upload PI is required" });
                    form.setError("uploadPI", { message: "At least one of Upload Invoice or Upload PI is required" });
                    return;
                }
                if (showInvoice && !hasInvoice) {
                    form.setError("uploadInvoice", { message: "Upload Invoice is required" });
                    return;
                }
                if (showPI && !hasPI) {
                    form.setError("uploadPI", { message: "Upload PI is required" });
                    return;
                }
            }

            const dto = mapMakerRequestFormToCreateDTO(values);
            await createMakerMutation.mutateAsync(dto);
            toast.success("Maker Request created successfully.");
            navigate(paths.shared.makerRequests);
        } catch {
            toast.error("Failed to create maker request. Please try again.");
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>New Maker Request</CardTitle>
                        <CardDescription className="mt-2">
                            Create a non-project payment request
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
                        <div className="border rounded-lg border-dashed p-4 space-y-4">
                            <h3 className="text-lg font-semibold">Payment Against</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="selectedHeading"
                                    label="Category Group"
                                    options={headingOptions}
                                    placeholder="Select category group..."
                                />
                                <SelectField
                                    control={form.control}
                                    name="categoryId"
                                    label="Category"
                                    options={categoryOptions}
                                    placeholder={selectedHeading ? "Select category..." : "Select a group first..."}
                                    disabled={!selectedHeading}
                                />
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
                            
                            <h3 className="text-lg font-semibold">Payment Mode</h3>
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

                            {paymentMode === "BANK_TRANSFER" && (
                                <div className="border rounded-lg bg-muted/30 p-4 space-y-4">
                                    <h4 className="text-md font-semibold flex items-center gap-2">
                                        <Landmark className="h-4 w-4" />
                                        Beneficiary Details
                                    </h4>
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
                                                        <Input value={newBeneficiary.name} onChange={(e) => setNewBeneficiary(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter beneficiary name" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>Account Number <span className="text-destructive">*</span></Label>
                                                        <Input value={newBeneficiary.accountNumber} onChange={(e) => setNewBeneficiary(prev => ({ ...prev, accountNumber: e.target.value }))} placeholder="Enter account number" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>IFSC Code <span className="text-destructive">*</span></Label>
                                                        <Input value={newBeneficiary.ifsc} onChange={(e) => setNewBeneficiary(prev => ({ ...prev, ifsc: e.target.value.toUpperCase() }))} placeholder="e.g. SBIN0001234" className="font-mono" />
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
                                <div className="border rounded-lg bg-muted/30 p-4 space-y-4">
                                    <h4 className="text-md font-semibold">Portal Link</h4>
                                    <div className="max-w-md">
                                        <FieldWrapper control={form.control} name="portalLink" label="Portal URL">
                                            {(field) => <Input {...field} placeholder="Enter portal payment link..." />}
                                        </FieldWrapper>
                                    </div>
                                </div>
                            )}
                            
                            <h3 className="text-lg font-semibold">Proof & Remark</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                {selectedCategoryConfig?.uploadInvoice && (
                                    <div>
                                        <TenderFileUploader
                                            label="Upload Invoice"
                                            context="tender-documents"
                                            value={form.watch("uploadInvoice")}
                                            onChange={(paths) => form.setValue("uploadInvoice", paths)}
                                        />
                                        {form.formState.errors.uploadInvoice && (
                                            <p className="text-sm text-destructive mt-1">{form.formState.errors.uploadInvoice.message}</p>
                                        )}
                                    </div>
                                )}
                                {selectedCategoryConfig?.uploadPI && (
                                    <div>
                                        <TenderFileUploader
                                            label="Upload PI"
                                            context="tender-documents"
                                            value={form.watch("uploadPI")}
                                            onChange={(paths) => form.setValue("uploadPI", paths)}
                                        />
                                        {form.formState.errors.uploadPI && (
                                            <p className="text-sm text-destructive mt-1">{form.formState.errors.uploadPI.message}</p>
                                        )}
                                    </div>
                                )}
                                <FieldWrapper control={form.control} name="remark" label="Remark (if any)">
                                    {(field) => <Input {...field} placeholder="Optional remarks" />}
                                </FieldWrapper>
                            </div>
                        </div>

                        <div className="flex items-end justify-end">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                                <Button type="submit" className="min-w-[160px]" disabled={createMakerMutation.isPending}>
                                    {createMakerMutation.isPending ? (
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
