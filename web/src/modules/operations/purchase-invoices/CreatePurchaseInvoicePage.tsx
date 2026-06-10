import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectOverview, usePoParties, useCreatePoParty } from "@/hooks/api/useProjectDashboard";
import { useCreatePurchaseInvoice, useNextPINumber } from "@/hooks/api/usePurchaseInvoices";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Calendar, Hash, Info, Loader2, UserPlus } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { formatDateForInput, mapPurchaseInvoiceFormToCreateDTO } from "./helpers/purchaseInvoice.mapper";
import { purchaseInvoiceFormSchema, type PurchaseInvoiceFormValues } from "./helpers/purchaseInvoice.schema";

const BUDGET_CATEGORIES = [
    { id: "Supply", name: "Supply" },
    { id: "Service", name: "Service" },
    { id: "Freight", name: "Freight" },
    { id: "Admin/Misc.", name: "Admin/Misc." },
    { id: "Buyback/Sale", name: "Buyback/Sale" },
    { id: "GEM Charges", name: "GEM Charges" },
];

const defaultFormValues: PurchaseInvoiceFormValues = {
    category: "",
    partyName: "",
    valuePreGst: null,
    gstAmount: null,
    invoiceDate: formatDateForInput(new Date()),
    invoiceFile: [],
};

export default function CreatePurchaseInvoicePage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const projectId = Number(projectIdParam);

    const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
    const { data: partiesData } = usePoParties();
    const createPartyMutation = useCreatePoParty();
    const parties = partiesData || [];
    const projectName = overview?.project?.projectName;
    const { data: nextPINumber, isLoading: isLoadingPINumber } = useNextPINumber(projectName);

    const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
    const [newPartyName, setNewPartyName] = useState("");

    const form = useForm<PurchaseInvoiceFormValues>({
        resolver: zodResolver(purchaseInvoiceFormSchema) as any,
        defaultValues: defaultFormValues,
    });

    const partyOptions = useMemo(() =>
        (parties || [])
            .filter((p: any) => !p.type || p.type === "seller")
            .map((p: any) => ({ id: p.name, name: p.name })),
        [parties]
    );

    const createPIMutation = useCreatePurchaseInvoice();

    const handleSubmit = async (values: PurchaseInvoiceFormValues) => {
        try {
            const piData = mapPurchaseInvoiceFormToCreateDTO(values, projectId, projectName);
            const result = await createPIMutation.mutateAsync(piData);
            toast.success(`Purchase Invoice #${result.invoiceNo} created successfully.`);
            navigate(paths.operations.projectDashboard(projectId));
        } catch {
            toast.error("Failed to create purchase invoice. Please try again.");
        }
    };

    const handleAddNewParty = async () => {
        if (!newPartyName.trim()) {
            toast.error("Party name is required");
            return;
        }
        try {
            await createPartyMutation.mutateAsync({ name: newPartyName, type: "seller" });
            toast.success(`Party "${newPartyName}" added successfully.`);
            form.setValue("partyName", newPartyName);
            setNewPartyName("");
            setIsAddPartyOpen(false);
        } catch (error: any) {
            toast.error(error?.message || "Failed to add party.");
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
                        <CardTitle>Raise Purchase Invoice</CardTitle>
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
                                    Invoice Number
                                </Label>
                                <Input value={isLoadingPINumber ? "Loading..." : nextPINumber} readOnly className="bg-muted font-mono" />
                                <p className="text-xs text-muted-foreground">Preview — final number assigned upon creation</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Project Name</Label>
                                <Input value={overview?.project?.projectName || ""} readOnly className="bg-muted" />
                            </div>
                            <FieldWrapper control={form.control} name="invoiceDate" label={<><Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Invoice Date <span className="text-destructive">*</span></>}>
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                        </div>

                        <div className="max-w-md">
                            <SelectField
                                control={form.control}
                                name="category"
                                label={<><Info className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Category - Budget Breakdown <span className="text-destructive">*</span></>}
                                options={BUDGET_CATEGORIES}
                                placeholder="Select category..."
                            />
                        </div>

                        <div className="max-w-md">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <SelectField
                                        control={form.control}
                                        name="partyName"
                                        label="Party Name"
                                        options={partyOptions}
                                        placeholder="Select existing party..."
                                    />
                                </div>
                                <Dialog open={isAddPartyOpen} onOpenChange={setIsAddPartyOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" type="button">
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Add New
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Add New Party</DialogTitle>
                                            <DialogDescription>Add a new party for the invoice.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Party Name <span className="text-destructive">*</span></Label>
                                                <Input
                                                    value={newPartyName}
                                                    onChange={(e) => setNewPartyName(e.target.value)}
                                                    placeholder="Enter party name"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter className="gap-2">
                                            <Button variant="outline" onClick={() => { setIsAddPartyOpen(false); setNewPartyName(""); }}>Cancel</Button>
                                            <Button onClick={handleAddNewParty} disabled={!newPartyName.trim() || createPartyMutation.isPending}>
                                                {createPartyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                                Add Party
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldWrapper control={form.control} name="valuePreGst" label={<>Value (Pre GST) <span className="text-destructive">*</span></>}>
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
                            <FieldWrapper control={form.control} name="gstAmount" label={<>GST Amount <span className="text-destructive">*</span></>}>
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

                        <div>
                            <TenderFileUploader
                                label="Upload Invoice"
                                context="tender-documents"
                                value={form.watch("invoiceFile")}
                                onChange={(paths) => form.setValue("invoiceFile", paths)}
                            />
                        </div>

                        <div className="flex items-end justify-end">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="min-w-[160px]" disabled={createPIMutation.isPending}>
                                    {createPIMutation.isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                                    ) : (
                                        "Create Invoice"
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
