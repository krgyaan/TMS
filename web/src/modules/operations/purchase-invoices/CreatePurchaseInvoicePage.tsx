import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { FileUploader } from "@/components/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useCreatePurchaseInvoice } from "@/hooks/api/usePurchaseInvoices";
import { usePurchaseOrderDetails, useProjectPurchaseOrders } from "@/hooks/api/usePurchaseOrders";
import { useProjectVendorWorkOrders, useVendorWorkOrderDetails } from "@/hooks/api/useVendorWorkOrders";
import { formatINR } from "@/hooks/useINRFormatter";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Calculator, Calendar, Hash, Loader2, Plus, RefreshCw, ShoppingCart, Trash2, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { calculateInvoiceTotals, formatDateForInput, mapPurchaseInvoiceFormToCreateDTO, snapshotFromCharges, snapshotFromProducts } from "./helpers/purchaseInvoice.mapper";
import { EXTRA_CHARGE_PRESETS, GST_RATES, purchaseInvoiceFormSchema, type PurchaseInvoiceFormValues } from "./helpers/purchaseInvoice.schema";
import type { ExtraChargePayload, InvoiceItemPayload } from "./helpers/purchaseInvoice.types";

const BUDGET_CATEGORIES = [
    { id: "Supply", name: "Supply" },
    { id: "Service", name: "Service" },
    { id: "Freight", name: "Freight" },
    { id: "Admin/Misc.", name: "Admin/Misc." },
    { id: "Buyback/Sale", name: "Buyback/Sale" },
    { id: "GEM Charges", name: "GEM Charges" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Snapshot {
    items: InvoiceItemPayload[];
    charges: ExtraChargePayload[];
}

export default function CreatePurchaseInvoicePage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const projectId = Number(projectIdParam);
    const [searchParams] = useSearchParams();
    const poIdParam = searchParams.get("poId");
    const vwoIdParam = searchParams.get("vwoId");

    const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
    const { data: poData } = useProjectPurchaseOrders(projectId);
    const { data: vwoData } = useProjectVendorWorkOrders(projectId);

    const poOptions = (poData?.purchaseOrders || []).map((po: any) => ({
        id: String(po.id),
        name: `${po.poNumber} - ${po.sellerName}`,
    }));

    const vwoOptions = (vwoData || []).map((vwo: any) => ({
        id: String(vwo.id),
        name: `${vwo.woNumber} - ${vwo.sellerName}`,
    }));

    const form = useForm<PurchaseInvoiceFormValues>({
        resolver: zodResolver(purchaseInvoiceFormSchema) as any,
        defaultValues: {
            invoiceNo: "",
            category: "",
            partyName: "",
            valuePreGst: 0,
            gstAmount: 0,
            invoiceDate: formatDateForInput(new Date()),
            invoiceFile: [],
            selectedPoId: poIdParam || "",
            selectedVwoId: vwoIdParam || "",
            items: [],
            extraCharges: [],
        },
    });

    const selectedPoId = form.watch("selectedPoId");
    const selectedVwoId = form.watch("selectedVwoId");
    const items = useWatch({ control: form.control, name: "items" }) || [];
    const charges = useWatch({ control: form.control, name: "extraCharges" }) || [];

    const { data: poDetails } = usePurchaseOrderDetails(selectedPoId ? Number(selectedPoId) : 0);
    const { data: vwoDetails } = useVendorWorkOrderDetails(selectedVwoId ? Number(selectedVwoId) : 0);
    const selectedDoc = selectedPoId ? poDetails : vwoDetails;
    const docKey = selectedPoId ? `po:${selectedPoId}` : selectedVwoId ? `vwo:${selectedVwoId}` : "";

    const primedKeyRef = useRef("");
    const snapshotRef = useRef<Snapshot>({ items: [], charges: [] });
    const overrideRef = useRef({ preGst: false, gst: false });
    const [itemsEdited, setItemsEdited] = useState<"yes" | "no">("no");
    const [chargesEdited, setChargesEdited] = useState<"yes" | "no">("no");

    const createPIMutation = useCreatePurchaseInvoice();

    const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({ control: form.control, name: "items" });
    const { fields: chargeFields, append: appendCharge, remove: removeCharge } = useFieldArray({ control: form.control, name: "extraCharges" });

    useEffect(() => {
        if (selectedVwoId) form.setValue("selectedPoId", "");
    }, [selectedVwoId, form]);

    useEffect(() => {
        if (selectedPoId) form.setValue("selectedVwoId", "");
    }, [selectedPoId, form]);

    // Prime the editable item/charge grids once per selected document.
    useEffect(() => {
        if (!selectedDoc || !docKey) return;
        if (primedKeyRef.current === docKey) return;
        primedKeyRef.current = docKey;

        const products = (selectedDoc.products || []) as any[];
        const docCharges = (selectedDoc.extraCharges || []) as any[];

        snapshotRef.current = {
            items: snapshotFromProducts(products),
            charges: snapshotFromCharges(docCharges),
        };
        overrideRef.current = { preGst: false, gst: false };

        form.setValue(
            "items",
            products.map(p => ({
                description: String(p.description ?? ""),
                hsnSac: p.hsnSac ? String(p.hsnSac) : "",
                qty: Number(p.qty ?? 0),
                rate: Number(p.rate ?? 0),
                gstRate: Number(p.gstRate ?? 18),
                unit: String(p.unit ?? "NOS"),
            }))
        );
        form.setValue(
            "extraCharges",
            docCharges.map(c => ({
                label: String(c.label ?? ""),
                amount: Number(c.taxableAmount ?? 0),
                gstRate: Number(c.gstRate ?? 18),
            }))
        );
        if (selectedDoc.sellerName) form.setValue("partyName", String(selectedDoc.sellerName));
        if (selectedDoc.category) form.setValue("category", String(selectedDoc.category));
    }, [docKey, selectedDoc, form]);

    // Edits are opt-in per invoice: reset the questions whenever the linked order changes.
    useEffect(() => {
        setItemsEdited("no");
        setChargesEdited("no");
    }, [docKey]);

    // Auto-calculate invoice totals from items + extra charges unless manually overridden.
    useEffect(() => {
        if (!items && !charges) return;
        const totals = calculateInvoiceTotals(form.getValues());
        if (!overrideRef.current.preGst) form.setValue("valuePreGst", round2(totals.valuePreGst));
        if (!overrideRef.current.gst) form.setValue("gstAmount", round2(totals.gstAmount));
    }, [items, charges, form]);

    const handleSubmit = async (values: PurchaseInvoiceFormValues) => {
        try {
            const snapshot = snapshotRef.current;
            const dto = mapPurchaseInvoiceFormToCreateDTO(values, projectId, snapshot, {
                itemsEdited: itemsEdited === "yes",
                chargesEdited: chargesEdited === "yes",
            });
            const result = await createPIMutation.mutateAsync(dto);
            toast.success(`Purchase Invoice #${result.invoiceNo} created successfully.`);
            navigate(paths.operations.projectDashboard(projectId));
        } catch {
            toast.error("Failed to create purchase invoice. Please try again.");
        }
    };

    if (isProjectLoading) {
        return (
            <div className="container mx-auto py-6 max-w-5xl">
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-32 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    const invoiceTotals = calculateInvoiceTotals(form.getValues());
    const hasDoc = selectedPoId || selectedVwoId;

    return (
        <div className="container mx-auto py-6 max-w-5xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Raise Purchase Invoice</CardTitle>
                            <CardDescription className="mt-2">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline">{overview?.tender?.tenderNumber || "N/A"}</Badge>
                                    <Badge variant="secondary">{overview?.project?.projectName || "N/A"}</Badge>
                                    {hasDoc && (
                                        <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Item edits update the linked order permanently</Badge>
                                    )}
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                <FieldWrapper
                                    control={form.control}
                                    name="invoiceNo"
                                    label={
                                        <>
                                            <Hash className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                            Invoice Number <span className="text-destructive">*</span>
                                        </>
                                    }
                                >
                                    {field => <Input {...field} placeholder="Enter invoice number" />}
                                </FieldWrapper>
                                <FieldWrapper
                                    control={form.control}
                                    name="invoiceDate"
                                    label={
                                        <>
                                            <Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                            Invoice Date <span className="text-destructive">*</span>
                                        </>
                                    }
                                >
                                    {field => <DateInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                            </div>

                            <div className="rounded-lg border border-dashed p-4 space-y-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4" />
                                    Link to Purchase Order / Vendor Work Order <span className="text-destructive">*</span>
                                </h3>
                                <p className="text-xs text-muted-foreground">Every invoice must be linked to exactly one Purchase Order or Vendor Work Order.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SelectField
                                        control={form.control}
                                        name="selectedPoId"
                                        label="Select PO"
                                        options={poOptions}
                                        placeholder="Choose a PO..."
                                        disabled={!!selectedVwoId}
                                    />
                                    <SelectField
                                        control={form.control}
                                        name="selectedVwoId"
                                        label="Select Vendor Work Order"
                                        options={vwoOptions}
                                        placeholder="Choose a VWO..."
                                        disabled={!!selectedPoId}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                <FieldWrapper
                                    control={form.control}
                                    name="partyName"
                                    label={
                                        <>
                                            Party Name <span className="text-destructive">*</span>
                                        </>
                                    }
                                >
                                    {field => <Input {...field} placeholder="Enter party name" />}
                                </FieldWrapper>
                                <SelectField control={form.control} name="category" label="Category" options={BUDGET_CATEGORIES} placeholder="Select category..." />
                            </div>

                            {hasDoc && (
                                <>
                                    <div className="rounded-lg border border-dashed p-4 space-y-4">
                                        <div>
                                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                                <RefreshCw className="h-4 w-4" />
                                                Changes to the {selectedPoId ? "PO" : "VWO"}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1">Any change you make here updates the linked order permanently.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Is any item changed?</Label>
                                                <RadioGroup value={itemsEdited} onValueChange={v => setItemsEdited(v as "yes" | "no")} className="flex gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="no" id="items-no" />
                                                        <Label htmlFor="items-no">No</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="yes" id="items-yes" />
                                                        <Label htmlFor="items-yes">Yes</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Any extra amount charged?</Label>
                                                <RadioGroup value={chargesEdited} onValueChange={v => setChargesEdited(v as "yes" | "no")} className="flex gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="no" id="charges-no" />
                                                        <Label htmlFor="charges-no">No</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="yes" id="charges-yes" />
                                                        <Label htmlFor="charges-yes">Yes</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                        </div>
                                    </div>

                                    {itemsEdited === "yes" && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between flex-wrap gap-4">
                                                <div>
                                                    <h4 className="font-semibold text-base text-primary flex items-center gap-2">
                                                        <Calculator className="h-4 w-4" />
                                                        Items{" "}
                                                        <Badge variant="secondary" className="ml-2">
                                                            {itemFields.length}
                                                        </Badge>
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Editable copy of the order lines. Changes are applied to the {selectedPoId ? "PO" : "VWO"} permanently.
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => appendItem({ description: "", hsnSac: "", qty: null, rate: null, gstRate: 18, unit: "NOS" })}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add Item
                                                </Button>
                                            </div>

                                            <div className="rounded-md border overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[5%]">#</TableHead>
                                                            <TableHead className="w-[30%]">Description *</TableHead>
                                                            <TableHead className="w-[10%]">HSN/SAC</TableHead>
                                                            <TableHead className="w-[8%]">Qty *</TableHead>
                                                            <TableHead className="w-[8%]">Unit</TableHead>
                                                            <TableHead className="w-[10%]">Rate (₹) *</TableHead>
                                                            <TableHead className="w-[8%]">GST % *</TableHead>
                                                            <TableHead className="w-[11%] text-right">Total</TableHead>
                                                            <TableHead className="w-[5%] text-right"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {itemFields.map((field, index) => {
                                                            const qty = items[index]?.qty ?? 0;
                                                            const rate = items[index]?.rate ?? 0;
                                                            const gstRate = items[index]?.gstRate ?? 0;
                                                            const lineTotal = Number(qty) * Number(rate);
                                                            const gstAmount = (lineTotal * Number(gstRate)) / 100;
                                                            return (
                                                                <TableRow key={field.id} className="group">
                                                                    <TableCell className="text-muted-foreground font-medium align-top pt-4">{index + 1}</TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`items.${index}.description`} label="">
                                                                            {f => <Input {...f} placeholder="Enter description" className="h-9" />}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`items.${index}.hsnSac`} label="">
                                                                            {f => <Input {...f} placeholder="HSN" className="h-9" />}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`items.${index}.qty`} label="">
                                                                            {f => (
                                                                                <NumberInput
                                                                                    value={f.value}
                                                                                    onChange={f.onChange}
                                                                                    min={0}
                                                                                    step={0.01}
                                                                                    placeholder="0"
                                                                                    className="h-9 text-right"
                                                                                />
                                                                            )}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`items.${index}.unit`} label="">
                                                                            {f => (
                                                                                <Input
                                                                                    value={f.value}
                                                                                    onChange={e => f.onChange(e.target.value.toUpperCase())}
                                                                                    maxLength={10}
                                                                                    placeholder="NOS"
                                                                                    className="h-9"
                                                                                />
                                                                            )}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`items.${index}.rate`} label="">
                                                                            {f => (
                                                                                <NumberInput
                                                                                    value={f.value}
                                                                                    onChange={f.onChange}
                                                                                    min={0}
                                                                                    step={0.01}
                                                                                    placeholder="0"
                                                                                    className="h-9 text-right"
                                                                                />
                                                                            )}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`items.${index}.gstRate`} label="">
                                                                            {f => (
                                                                                <Select value={String(f.value ?? 18)} onValueChange={v => f.onChange(Number(v))}>
                                                                                    <SelectTrigger className="h-9">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {GST_RATES.map(r => (
                                                                                            <SelectItem key={r} value={String(r)}>
                                                                                                {r}%
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            )}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 text-right align-top pt-4 font-medium tabular-nums">
                                                                        {Number(qty) > 0 && Number(rate) > 0 ? formatINR(lineTotal + gstAmount) : "-"}
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <TooltipProvider>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                                            onClick={() => removeItem(index)}
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>Remove</TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                        {itemFields.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                                    No items listed. Click "Add Item" to begin.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                    <TableFooter>
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-right font-medium">
                                                                Pre-GST (Items)
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums">{formatINR(invoiceTotals.itemsValuePreGst)}</TableCell>
                                                            <TableCell></TableCell>
                                                            <TableCell></TableCell>
                                                        </TableRow>
                                                    </TableFooter>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                    {chargesEdited === "yes" && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between flex-wrap gap-4">
                                                <div>
                                                    <h4 className="font-semibold text-base text-primary flex items-center gap-2">
                                                        <Truck className="h-4 w-4" />
                                                        Other Charges{" "}
                                                        <Badge variant="secondary" className="ml-2">
                                                            {chargeFields.length}
                                                        </Badge>
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">Freight and other one-off charges on this order.</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {EXTRA_CHARGE_PRESETS.map(preset => (
                                                        <Button
                                                            key={preset.id}
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => appendCharge({ label: preset.name, amount: null, gstRate: 18 })}
                                                        >
                                                            <Truck className="mr-1.5 h-3.5 w-3.5" />
                                                            {preset.name}
                                                        </Button>
                                                    ))}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => appendCharge({ label: "", amount: null, gstRate: 18 })}>
                                                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                        Custom
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="rounded-md border overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[5%]">#</TableHead>
                                                            <TableHead className="w-[35%]">Charge *</TableHead>
                                                            <TableHead className="w-[20%]">Amount (₹) *</TableHead>
                                                            <TableHead className="w-[15%]">GST % *</TableHead>
                                                            <TableHead className="w-[15%] text-right">Total</TableHead>
                                                            <TableHead className="w-[10%] text-right"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {chargeFields.map((field, index) => {
                                                            const amount = charges[index]?.amount ?? 0;
                                                            const gstRate = charges[index]?.gstRate ?? 0;
                                                            const total = Number(amount) + (Number(amount) * Number(gstRate)) / 100;
                                                            return (
                                                                <TableRow key={field.id} className="group">
                                                                    <TableCell className="text-muted-foreground font-medium align-top pt-4">{index + 1}</TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`extraCharges.${index}.label`} label="">
                                                                            {f => <Input {...f} placeholder="Charge label" className="h-9" />}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`extraCharges.${index}.amount`} label="">
                                                                            {f => (
                                                                                <NumberInput
                                                                                    value={f.value}
                                                                                    onChange={f.onChange}
                                                                                    min={0}
                                                                                    step={0.01}
                                                                                    placeholder="0"
                                                                                    className="h-9 text-right"
                                                                                />
                                                                            )}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper control={form.control} name={`extraCharges.${index}.gstRate`} label="">
                                                                            {f => (
                                                                                <Select value={String(f.value ?? 18)} onValueChange={v => f.onChange(Number(v))}>
                                                                                    <SelectTrigger className="h-9">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {GST_RATES.map(r => (
                                                                                            <SelectItem key={r} value={String(r)}>
                                                                                                {r}%
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            )}
                                                                        </FieldWrapper>
                                                                    </TableCell>
                                                                    <TableCell className="p-1 text-right align-top pt-4 font-medium tabular-nums">
                                                                        {Number(amount) > 0 ? formatINR(total) : "-"}
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <TooltipProvider>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                                            onClick={() => removeCharge(index)}
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>Remove</TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                        {chargeFields.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                                    No other charges yet. Add freight or a custom charge, or skip.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                    <TableFooter>
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-right font-medium">
                                                                Other Charges Total
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium tabular-nums">{formatINR(invoiceTotals.chargesGstAmount)}</TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums">
                                                                {formatINR(invoiceTotals.chargesValuePreGst + invoiceTotals.chargesGstAmount)}
                                                            </TableCell>
                                                            <TableCell></TableCell>
                                                        </TableRow>
                                                    </TableFooter>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Calculator className="h-4 w-4" />
                                    Invoice Summary
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <Label>Value (Pre GST)</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                title="Reset to auto-calculated"
                                                onClick={() => {
                                                    overrideRef.current.preGst = false;
                                                    form.setValue("valuePreGst", round2(calculateInvoiceTotals(form.getValues()).valuePreGst));
                                                }}
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <FieldWrapper control={form.control} name="valuePreGst" label="">
                                            {field => (
                                                <NumberInput
                                                    value={field.value}
                                                    onChange={v => {
                                                        overrideRef.current.preGst = true;
                                                        field.onChange(v);
                                                    }}
                                                    min={0}
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    className="h-9 text-right"
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <Label>GST Amount</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                title="Reset to auto-calculated"
                                                onClick={() => {
                                                    overrideRef.current.gst = false;
                                                    form.setValue("gstAmount", round2(calculateInvoiceTotals(form.getValues()).gstAmount));
                                                }}
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <FieldWrapper control={form.control} name="gstAmount" label="">
                                            {field => (
                                                <NumberInput
                                                    value={field.value}
                                                    onChange={v => {
                                                        overrideRef.current.gst = true;
                                                        field.onChange(v);
                                                    }}
                                                    min={0}
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    className="h-9 text-right"
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                    <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                                        <span className="text-xs text-muted-foreground">Invoice Total</span>
                                        <span className="text-xl font-bold tabular-nums">{formatINR(invoiceTotals.grandTotal)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="max-w-xl">
                                <FileUploader
                                    label="Upload Invoice"
                                    context="tender-documents"
                                    value={form.watch("invoiceFile")}
                                    onChange={paths => form.setValue("invoiceFile", paths)}
                                />
                            </div>

                            <div className="flex items-end justify-end">
                                <div className="flex items-center gap-4">
                                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="min-w-[160px]" disabled={createPIMutation.isPending}>
                                        {createPIMutation.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
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
        </div>
    );
}
