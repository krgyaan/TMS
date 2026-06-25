import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useBeneficiaries, useCreateBeneficiary } from "@/hooks/api/useProjectPaymentRequests";
import { useImprestCategories } from "@/hooks/api/useImprestCategories";
import { useCreateMakerRequest } from "@/hooks/api/useMakerRequests";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Landmark, Loader2, Plus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { paths } from "@/app/routes/paths";
import { makerRequestFormSchema, type MakerRequestFormValues } from "./helpers/makerRequest.schema";
import { mapMakerRequestFormToCreateDTO } from "./helpers/makerRequest.mapper";

const defaultFormValues: MakerRequestFormValues = {
    selectedBeneficiaryId: "",
    partyName: "",
    accountNumber: "",
    bankName: "",
    ifsc: "",
    amount: null,
    categoryId: "",
    billFiles: [],
    remark: "",
};

export default function CreateMakerRequestPage() {
    const navigate = useNavigate();

    const { data: beneficiaries } = useBeneficiaries();
    const { data: categories } = useImprestCategories();
    const createMakerMutation = useCreateMakerRequest();
    const createBeneficiaryMutation = useCreateBeneficiary();

    const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false);
    const [newBeneficiary, setNewBeneficiary] = useState({ name: "", accountNumber: "", ifsc: "", bankName: "" });

    const form = useForm<MakerRequestFormValues>({
        resolver: zodResolver(makerRequestFormSchema) as any,
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

    const categoryOptions = (categories || []).map((c: any) => ({
        id: String(c.id),
        name: c.name,
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

    const handleSubmit = async (values: MakerRequestFormValues) => {
        try {
            const dto = mapMakerRequestFormToCreateDTO(values);
            await createMakerMutation.mutateAsync(dto);
            toast.success("Maker Request created successfully.");
            navigate(paths.accounts.paymentRequests);
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
                                            <div className="space-y-1">
                                                <Label>Bank Name</Label>
                                                <Input value={newBeneficiary.bankName} onChange={(e) => setNewBeneficiary(prev => ({ ...prev, bankName: e.target.value }))} placeholder="e.g. State Bank of India" />
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
                            <h3 className="text-lg font-semibold">Category & Attachments</h3>
                            <div className="max-w-md">
                                <SelectField
                                    control={form.control}
                                    name="categoryId"
                                    label="Category"
                                    options={categoryOptions}
                                    placeholder="Select category..."
                                />
                            </div>
                            <TenderFileUploader
                                label="Upload Bill / Proof"
                                context="tender-documents"
                                value={form.watch("billFiles")}
                                onChange={(paths) => form.setValue("billFiles", paths)}
                            />
                            <FieldWrapper control={form.control} name="remark" label="Remark">
                                {(field) => <Input {...field} placeholder="Optional remarks" />}
                            </FieldWrapper>
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
