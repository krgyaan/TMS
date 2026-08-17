import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { usePoParties, useCreatePoParty, useProjectInventory } from "@/hooks/api/usePurchaseOrders";
import { useCreateSaleInvoice, useWoBillingData } from "@/hooks/api/useSaleInvoices";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Building2, Copy, Eye, FileText, ListChecks, Mail, MapPin, Trash2, Truck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { InventoryItemCombobox } from "./components/InventoryItemCombobox";
import { SIFormPreview } from "./components/SIFormPreview";
import { formatCurrency, formatDateForInput, mapSaleInvoiceFormToCreateDTO } from "./helpers/saleInvoice.mapper";
import { saleInvoiceFormSchema, type SaleInvoiceFormValues } from "./helpers/saleInvoice.schema";
import type { ProjectInventoryItem } from "./helpers/saleInvoice.types";
import { PartyFormDialog, type CreatePartyPayload } from "@/modules/operations/vendor-master/PartyFormDialog";

const defaultFormValues: SaleInvoiceFormValues = {
    invoiceDate: formatDateForInput(new Date()),
    billingCustomerName: "",
    billingAddress: "",
    billingGst: "",
    billingEmail: "",
    billingPanNo: "",
    billingMsmeNo: "",
    billingCinNo: "",
    shippingCustomerName: "",
    shippingAddress: "",
    shippingGst: "",
    shippingPanNo: "",
    selectedBillingAddressId: "",
    selectedShippingAddressId: "",
    sellerId: "",
    partyId: "",
    dispatchFromName: "",
    dispatchFromAddress: "",
    dispatchFromGst: "",
    dispatchVehicleNo: "",
    dispatchLrNo: "",
    dispatchToName: "",
    dispatchToAddress: "",
    dispatchToGst: "",
    items: [],
    remarks: "",
};

const FormSkeleton = () => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
        </div>
        {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                        <div key={j} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

export default function CreateSaleInvoicePage() {
    const navigate = useNavigate();
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const projectId = Number(projectIdParam);

    const { data: overview, isLoading: isProjectLoading } = useProjectOverview(projectId);
    const { data: woBillingData, isLoading: isWoDataLoading } = useWoBillingData(projectId);
    const { data: inventoryData } = useProjectInventory(projectId);
    const { data: partiesData } = usePoParties();
    const createPartyMutation = useCreatePoParty();
    const createSIMutation = useCreateSaleInvoice();

    const parties = partiesData || [];
    const [partyCreationType, setPartyCreationType] = useState<"seller" | "ship_to">("seller");
    const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
    const [isShipToPartyOpen, setIsShipToPartyOpen] = useState(false);

    const [showPreview, setShowPreview] = useState(false);
    const [dispatchSameAsShipping, setDispatchSameAsShipping] = useState(false);

    const form = useForm<SaleInvoiceFormValues>({
        resolver: zodResolver(saleInvoiceFormSchema) as any,
        defaultValues: defaultFormValues,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items" as any,
    });

    const items = useWatch({ control: form.control, name: "items" as any }) || [];

    const inventoryItems = useMemo(
        () => (inventoryData?.items ?? []).filter((i: ProjectInventoryItem) => i.remainingQty > 0),
        [inventoryData],
    );

    const addedQtyByProduct = useMemo(() => {
        const map = new Map<number, number>();
        items.forEach((it: any) => {
            if (it.purchaseOrderProductId) {
                map.set(it.purchaseOrderProductId, (map.get(it.purchaseOrderProductId) || 0) + Number(it.qty || 0));
            }
        });
        return map;
    }, [items]);

    const availableInventory = useMemo(() => {
        return inventoryItems.filter((i) => (addedQtyByProduct.get(i.id) || 0) < i.remainingQty);
    }, [inventoryItems, addedQtyByProduct]);

    const remainingForItem = (item: ProjectInventoryItem) =>
        item.remainingQty - (addedQtyByProduct.get(item.id) || 0);

    const calculations = useMemo(() => {
        let subtotal = 0;
        let totalGst = 0;
        items.forEach((item: any) => {
            const qty = Number(item?.qty || 0);
            const rate = Number(item?.rate || 0);
            const gstRate = Number(item?.gstRate || 0);
            const lineTotal = qty * rate;
            subtotal += lineTotal;
            totalGst += (lineTotal * gstRate) / 100;
        });
        return { subtotal, totalGst, grandTotal: subtotal + totalGst };
    }, [items]);

    const appendFromInventory = (item: ProjectInventoryItem) => {
        const remaining = remainingForItem(item);
        if (remaining <= 0) return;
        append({
            itemDescription: item.description,
            qty: remaining,
            rate: item.rate,
            gstRate: item.gstRate,
            purchaseOrderProductId: item.id,
            unit: item.unit || "NOS",
            hsnSac: item.hsnSac || undefined,
        } as any);
    };

    const handleAddAll = () => {
        if (availableInventory.length === 0) return;
        availableInventory.forEach((item) => appendFromInventory(item));
    };

    const handleRemoveItem = (index: number) => {
        remove(index);
    };

    const itemRow = (index: number) => items[index] ?? {};

    const sellerOptions = useMemo(() => [
        ...(parties || [])
            .filter((p: any) => !p.type || p.type === "seller")
            .map((p: any) => ({ id: String(p.id), name: p.alias ? `${p.name} (${p.alias})` : p.name })),
    ], [parties]);

    const partyOptions = useMemo(() => [
        ...(parties || [])
            .filter((p: any) => p.type === "ship_to")
            .map((p: any) => ({ id: String(p.id), name: p.alias ? `${p.name} (${p.alias})` : p.name })),
    ], [parties]);

    const selectedSellerId = form.watch("sellerId");
    const selectedPartyId = form.watch("partyId");

    useEffect(() => {
        if (!selectedSellerId) return;
        const party = parties.find((p: any) => String(p.id) === selectedSellerId);
        if (!party) return;
        form.setValue("billingCustomerName", party.name || "");
        form.setValue("billingAddress", party.address || "");
        form.setValue("billingGst", party.gstNo || "");
        form.setValue("billingEmail", party.email || "");
        form.setValue("billingPanNo", party.pan || "");
        form.setValue("billingMsmeNo", party.msme || "");
    }, [selectedSellerId, parties, form]);

    useEffect(() => {
        if (!selectedPartyId) return;
        const party = parties.find((p: any) => String(p.id) === selectedPartyId);
        if (!party) return;
        form.setValue("shippingCustomerName", party.name || "");
        form.setValue("shippingAddress", party.address || "");
        form.setValue("shippingGst", party.gstNo || "");
        form.setValue("shippingPanNo", party.pan || "");
    }, [selectedPartyId, parties, form]);

    const handleDispatchSameAsShipping = (checked: boolean) => {
        setDispatchSameAsShipping(checked);
        if (checked) {
            form.setValue("dispatchToName", form.getValues("shippingCustomerName"));
            form.setValue("dispatchToAddress", form.getValues("shippingAddress"));
            form.setValue("dispatchToGst", form.getValues("shippingGst"));
        }
    };

    const handleAddNewParty = async (partyData: CreatePartyPayload) => {
        if (!partyData.name.trim()) {
            toast.error("Party name is required");
            return;
        }
        try {
            await createPartyMutation.mutateAsync({
                name: partyData.name,
                alias: partyData.alias || undefined,
                email: partyData.email || undefined,
                address: partyData.address || undefined,
                gstNo: partyData.gstNo || undefined,
                pan: partyData.pan || undefined,
                msme: partyData.msme || undefined,
                type: partyCreationType,
                contact_person: partyData.contact_person || undefined,
                mobile_number: partyData.mobile_number || undefined,
            });
            toast.success(`Party "${partyData.name}" has been added successfully.`);
            setIsAddPartyOpen(false);
            setIsShipToPartyOpen(false);
        } catch (error: any) {
            toast.error(error?.message || "Failed to add party. Please try again.");
        }
    };

    const handlePreview = async () => {
        const isValid = await form.trigger();
        if (isValid) {
            setShowPreview(true);
        }
    };

    const handleSubmit = async (values: SaleInvoiceFormValues) => {
        try {
            const siData = mapSaleInvoiceFormToCreateDTO(values, projectId, woBillingData?.woDetailId);
            const result = await createSIMutation.mutateAsync(siData);
            toast.success(`Sale Invoice #${result.invoiceNumber} request created. Account team will prepare the draft.`);
            navigate(paths.operations.saleInvoices);
        } catch (error: any) {
            toast.error(error?.message || "Failed to create sale invoice. Please try again.");
        }
    };

    if (showPreview) {
        return (
            <div className="container mx-auto py-6 max-w-6xl">
                <SIFormPreview
                    formValues={form.getValues()}
                    invoiceNumber={undefined}
                    projectName={overview?.project?.projectName}
                    tenderNumber={overview?.tender?.tenderNumber}
                    isSubmitting={createSIMutation.isPending}
                    onBack={() => setShowPreview(false)}
                    onSubmit={form.handleSubmit(handleSubmit)}
                />
            </div>
        );
    }

    const isLoading = isProjectLoading || isWoDataLoading;

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 max-w-6xl">
                <FormSkeleton />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Request for Sale Invoice</CardTitle>
                    </div>
                    <CardAction>
                        <Button variant="outline" size="sm" type="button" onClick={() => navigate(-1)} className="flex items-center space-x-2">
                            <ArrowLeft className="h-4 w-4" />
                            <span>Go Back</span>
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                        <FieldWrapper control={form.control} name="invoiceDate" label={<>Invoice Date <span className="text-destructive">*</span></>}>
                            {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                        </FieldWrapper>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h4 className="font-semibold text-base text-primary flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Line Items
                                        <Badge variant="secondary" className="ml-2">
                                            {fields.length} {fields.length === 1 ? "item" : "items"}
                                        </Badge>
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Click an item below to add it to the invoice instantly. Items can be added only once per invoice.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-end gap-3 rounded-md border p-3 bg-muted/30">
                                <div className="min-w-[320px] flex-1 space-y-1.5">
                                    <label className="text-sm font-medium">Select line item from PO inventory</label>
                                    <InventoryItemCombobox
                                        items={availableInventory}
                                        onSelect={(item) => appendFromInventory(item)}
                                        disabled={availableInventory.length === 0}
                                    />
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddAll} disabled={availableInventory.length === 0}>
                                    <ListChecks className="mr-2 h-4 w-4" />
                                    Add All
                                </Button>
                            </div>

                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[5%]">#</TableHead>
                                            <TableHead className="w-[40%]">Description *</TableHead>
                                            <TableHead className="w-[10%]">Qty *</TableHead>
                                            <TableHead className="w-[12%]">Rate (₹) *</TableHead>
                                            <TableHead className="w-[8%]">GST %</TableHead>
                                            <TableHead className="w-[12%] text-right">Amount</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => {
                                            const item = itemRow(index);
                                            const linkedItem = item.purchaseOrderProductId
                                                ? (inventoryData?.items ?? []).find((i: ProjectInventoryItem) => i.id === item.purchaseOrderProductId)
                                                : undefined;
                                            const maxQty = linkedItem
                                                ? linkedItem.remainingQty - (addedQtyByProduct.get(linkedItem.id) || 0) + Number(item.qty || 0)
                                                : undefined;
                                            const qty = Number(item?.qty ?? 0);
                                            const rate = Number(item?.rate ?? 0);
                                            const amount = qty * rate;
                                            return (
                                                <TableRow key={field.id} className="group">
                                                    <TableCell className="text-muted-foreground font-medium align-top pt-4">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="p-1 align-top pt-2">
                                                        <FieldWrapper control={form.control} name={`items.${index}.itemDescription` as any} label="">
                                                            {(fieldProps) => (
                                                                <Textarea readOnly {...fieldProps} placeholder="Enter description" rows={2} className="min-h-[36px]" />
                                                            )}
                                                        </FieldWrapper>
                                                        {linkedItem && (
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Badge variant="secondary" className="text-[10px] font-mono">
                                                                    PO: {linkedItem.poNumber}
                                                                </Badge>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    Remaining: {Math.max(0, maxQty ?? 0)} {linkedItem.unit || "NOS"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="p-1 align-top pt-2">
                                                        <FieldWrapper control={form.control} name={`items.${index}.qty` as any} label="">
                                                            {(fieldProps) => (
                                                                <NumberInput
                                                                    value={fieldProps.value}
                                                                    onChange={(v) => {
                                                                        const next = Number(v ?? 0);
                                                                        if (maxQty !== undefined && next > maxQty) {
                                                                            toast.error(`Quantity cannot exceed remaining PO qty (${maxQty})`);
                                                                            return;
                                                                        }
                                                                        fieldProps.onChange(v);
                                                                    }}
                                                                    min={0}
                                                                    step={0.01}
                                                                    placeholder="0"
                                                                    className="h-9 text-right"
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </TableCell>
                                                    <TableCell className="p-1 align-top pt-2">
                                                        <FieldWrapper control={form.control} name={`items.${index}.rate` as any} label="">
                                                            {(fieldProps) => (
                                                                <NumberInput
                                                                    value={fieldProps.value}
                                                                    onChange={fieldProps.onChange}
                                                                    min={0}
                                                                    step={0.01}
                                                                    placeholder="0"
                                                                    className="h-9 text-right"
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </TableCell>
                                                    <TableCell className="p-1 align-top pt-2">
                                                        <SelectField
                                                            control={form.control}
                                                            name={`items.${index}.gstRate` as any}
                                                            label=""
                                                            options={[
                                                                { value: "0", label: "0%" },
                                                                { value: "5", label: "5%" },
                                                                { value: "12", label: "12%" },
                                                                { value: "18", label: "18%" },
                                                                { value: "28", label: "28%" },
                                                            ]}
                                                            placeholder="GST"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-1 text-right align-top pt-4 font-medium tabular-nums">
                                                        {qty > 0 && rate > 0 ? formatCurrency(amount) : "-"}
                                                    </TableCell>
                                                    <TableCell className="p-1 align-top pt-2">
                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => append({ ...item } as any)}
                                                                        >
                                                                            <Copy className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Duplicate</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            {fields.length > 1 && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                                onClick={() => handleRemoveItem(index)}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Remove</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {fields.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                    No items added yet. Pick items from the PO inventory dropdown above.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-right font-medium">
                                                Subtotal
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">
                                                {formatCurrency(calculations.subtotal)}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-right font-medium text-blue-600">
                                                GST
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums text-blue-600">
                                                {formatCurrency(calculations.totalGst)}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-right font-bold">
                                                Grand Total
                                            </TableCell>
                                            <TableCell className="text-right font-bold tabular-nums">
                                                {formatCurrency(calculations.grandTotal)}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 mt-6">
                            <div className="border rounded-lg border-primary border-dashed p-4 w-full md:w-1/2">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Billing Party
                                    </h3>
                                    <Button variant="outline" size="sm" type="button" onClick={() => { setPartyCreationType("seller"); setIsAddPartyOpen(true); }}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Add New Billing Party
                                    </Button>
                                </div>
                                <PartyFormDialog
                                    title="Add New Billing Party"
                                    description="Add a new party to use as the billing party."
                                    open={isAddPartyOpen}
                                    onOpenChange={(open) => { setIsAddPartyOpen(open); if (open) setPartyCreationType("seller"); }}
                                    onSubmit={handleAddNewParty}
                                    isLoading={createPartyMutation.isPending}
                                />
                                <p className="text-sm text-muted-foreground mb-4">Select or enter the billing party details</p>
                                <div className="mb-6">
                                    <SelectField
                                        control={form.control}
                                        name="sellerId"
                                        label="Select Billing Party"
                                        options={sellerOptions}
                                        placeholder="Choose a billing party..."
                                    />
                                </div>
                                {selectedSellerId && selectedSellerId !== "" && (
                                    <div className="space-y-4">
                                        <FieldWrapper control={form.control} name="billingCustomerName" label={<><Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Customer Name <span className="text-destructive">*</span></>}>
                                            {(field) => <Input {...field} placeholder="Enter customer name" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="billingAddress" label={<><MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Address <span className="text-destructive">*</span></>}>
                                            {(field) => <Textarea {...field} placeholder="Enter billing address" rows={3} />}
                                        </FieldWrapper>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FieldWrapper control={form.control} name="billingGst" label="GST Number">
                                                {(field) => (
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g. 27ABCDE1234F1Z5"
                                                        className="font-mono"
                                                        maxLength={15}
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="billingEmail" label={<><Mail className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Email</>}>
                                                {(field) => <Input {...field} type="email" placeholder="billing@example.com" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="billingPanNo" label="PAN Number">
                                                {(field) => (
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g. ABCDE1234F"
                                                        className="font-mono"
                                                        maxLength={10}
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="billingMsmeNo" label="MSME Number">
                                                {(field) => (
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g. UDYAM-XX-00-0000000"
                                                        className="font-mono"
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="billingCinNo" label={<><Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />CIN Number</>}>
                                                {(field) => (
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g. U74999KA2020PTC123456"
                                                        className="font-mono"
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border rounded-lg border-sidebar-primary-foreground border-dashed p-4 w-full md:w-1/2">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Ship To Details
                                    </h3>
                                    <Button variant="outline" size="sm" type="button" onClick={() => { setPartyCreationType("ship_to"); setIsShipToPartyOpen(true); }}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Add New Ship To
                                    </Button>
                                </div>
                                <PartyFormDialog
                                    title="Add New Ship To"
                                    description="Add a new party to use as a shipping destination."
                                    open={isShipToPartyOpen}
                                    onOpenChange={(open) => { setIsShipToPartyOpen(open); if (open) setPartyCreationType("ship_to"); }}
                                    onSubmit={handleAddNewParty}
                                    isLoading={createPartyMutation.isPending}
                                />
                                <p className="text-sm text-muted-foreground mb-4">Delivery destination information</p>
                                <div className="mb-6">
                                    <SelectField
                                        control={form.control}
                                        name="partyId"
                                        label="Select Shipping Destination"
                                        options={partyOptions}
                                        placeholder="Choose shipping destination..."
                                    />
                                </div>
                                {selectedPartyId && selectedPartyId !== "" && (
                                    <div className="space-y-4">
                                        <FieldWrapper control={form.control} name="shippingCustomerName" label={<><Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Customer Name <span className="text-destructive">*</span></>}>
                                            {(field) => <Input {...field} placeholder="Enter customer name" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="shippingAddress" label={<><MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Address <span className="text-destructive">*</span></>}>
                                            {(field) => <Textarea {...field} placeholder="Enter shipping address" rows={3} />}
                                        </FieldWrapper>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FieldWrapper control={form.control} name="shippingGst" label="GST Number">
                                                {(field) => (
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g. 27ABCDE1234F1Z5"
                                                        className="font-mono"
                                                        maxLength={15}
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="shippingPanNo" label="PAN Number">
                                                {(field) => (
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g. ABCDE1234F"
                                                        className="font-mono"
                                                        maxLength={10}
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dispatch From / To */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="border rounded-lg border-dashed p-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                                    <Truck className="h-5 w-5" />
                                    Dispatch From <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                                </h3>
                                <div className="space-y-4 mt-4">
                                    <FieldWrapper control={form.control} name="dispatchFromName" label="Name">
                                        {(field) => <Input {...field} placeholder="Dispatch from name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dispatchFromAddress" label="Address">
                                        {(field) => <Textarea {...field} placeholder="Dispatch from address" rows={2} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dispatchFromGst" label="GST">
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g. 27ABCDE1234F1Z5"
                                                className="font-mono"
                                                maxLength={15}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FieldWrapper control={form.control} name="dispatchVehicleNo" label="Vehicle No.">
                                            {(field) => <Input {...field} placeholder="Vehicle number" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="dispatchLrNo" label="LR No.">
                                            {(field) => <Input {...field} placeholder="LR number" />}
                                        </FieldWrapper>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-lg border-dashed p-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                                    <Truck className="h-5 w-5" />
                                    Dispatch To <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                                </h3>
                                <div className="flex items-center gap-2 mt-3 mb-4">
                                    <Checkbox
                                        id="dispatch-same-as-shipping"
                                        checked={dispatchSameAsShipping}
                                        onCheckedChange={(v) => handleDispatchSameAsShipping(v === true)}
                                    />
                                    <label htmlFor="dispatch-same-as-shipping" className="text-sm cursor-pointer">
                                        Same as Shipping Address
                                    </label>
                                </div>
                                <div className="space-y-4">
                                    <FieldWrapper control={form.control} name="dispatchToName" label="Name">
                                        {(field) => <Input {...field} placeholder="Dispatch to name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dispatchToAddress" label="Address">
                                        {(field) => <Textarea {...field} placeholder="Dispatch to address" rows={2} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dispatchToGst" label="GST">
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g. 27ABCDE1234F1Z5"
                                                className="font-mono"
                                                maxLength={15}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 max-w-md">
                            <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                {(field) => <Textarea {...field} placeholder="Any additional notes..." rows={2} />}
                            </FieldWrapper>
                        </div>

                        <div className="flex items-end justify-end mt-8">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="button" onClick={handlePreview} className="min-w-[160px]">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview & Create
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}