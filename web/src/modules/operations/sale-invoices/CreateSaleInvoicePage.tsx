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
import { useProjectInventory } from "@/hooks/api/usePurchaseOrders";
import { useCreateSaleInvoice, useWoBillingData } from "@/hooks/api/useSaleInvoices";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Building2, Copy, Eye, FileText, ListChecks, MapPin, Plus, Trash2, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AddAddressDialog } from "./components/AddAddressDialog";
import { InventoryItemCombobox } from "./components/InventoryItemCombobox";
import { SIFormPreview } from "./components/SIFormPreview";
import { formatCurrency, formatDateForInput, mapSaleInvoiceFormToCreateDTO } from "./helpers/saleInvoice.mapper";
import { saleInvoiceFormSchema, type SaleInvoiceFormValues } from "./helpers/saleInvoice.schema";
import type { ProjectInventoryItem, WoBillingAddress, WoShippingAddress } from "./helpers/saleInvoice.types";

const defaultFormValues: SaleInvoiceFormValues = {
    invoiceDate: formatDateForInput(new Date()),
    billingCustomerName: "",
    billingAddress: "",
    billingGst: "",
    shippingCustomerName: "",
    shippingAddress: "",
    shippingGst: "",
    selectedBillingAddressId: "",
    selectedShippingAddressId: "",
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
    const createSIMutation = useCreateSaleInvoice();

    const [showPreview, setShowPreview] = useState(false);
    const [dispatchSameAsShipping, setDispatchSameAsShipping] = useState(false);

    const [isBillingAddrOpen, setIsBillingAddrOpen] = useState(false);
    const [isShippingAddrOpen, setIsShippingAddrOpen] = useState(false);
    const [newBillingAddr, setNewBillingAddr] = useState({ customerName: "", address: "", gst: "" });
    const [newShippingAddr, setNewShippingAddr] = useState({ customerName: "", address: "", gst: "" });

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

    const billingAddressOptions = useMemo(() => {
        return (woBillingData?.billingAddresses || []).map((addr: WoBillingAddress) => ({
            label: addr.customerName,
            value: String(addr.id),
            address: addr.address,
            gst: addr.gst || "",
        }));
    }, [woBillingData]);

    const shippingAddressOptions = useMemo(() => {
        return (woBillingData?.shippingAddresses || []).map((addr: WoShippingAddress) => ({
            label: addr.customerName,
            value: String(addr.id),
            address: addr.address,
            gst: addr.gst || "",
        }));
    }, [woBillingData]);

    const selectedBillingId = form.watch("selectedBillingAddressId");
    const selectedShippingId = form.watch("selectedShippingAddressId");

    useEffect(() => {
        if (!selectedBillingId) return;
        const addr = (woBillingData?.billingAddresses || []).find(
            (a: WoBillingAddress) => String(a.id) === selectedBillingId
        );
        if (addr) {
            form.setValue("billingCustomerName", addr.customerName);
            form.setValue("billingAddress", addr.address);
            form.setValue("billingGst", addr.gst || "");
        }
    }, [selectedBillingId, woBillingData, form]);

    useEffect(() => {
        if (!selectedShippingId) return;
        const addr = (woBillingData?.shippingAddresses || []).find(
            (a: WoShippingAddress) => String(a.id) === selectedShippingId
        );
        if (addr) {
            form.setValue("shippingCustomerName", addr.customerName);
            form.setValue("shippingAddress", addr.address);
            form.setValue("shippingGst", addr.gst || "");
        }
    }, [selectedShippingId, woBillingData, form]);

    const handleDispatchSameAsShipping = (checked: boolean) => {
        setDispatchSameAsShipping(checked);
        if (checked) {
            form.setValue("dispatchToName", form.getValues("shippingCustomerName"));
            form.setValue("dispatchToAddress", form.getValues("shippingAddress"));
            form.setValue("dispatchToGst", form.getValues("shippingGst"));
        }
    };

    const handleAddBillingAddress = () => {
        if (!newBillingAddr.customerName.trim() || !newBillingAddr.address.trim()) {
            toast.error("Customer name and address are required");
            return;
        }
        form.setValue("billingCustomerName", newBillingAddr.customerName);
        form.setValue("billingAddress", newBillingAddr.address);
        form.setValue("billingGst", newBillingAddr.gst);
        setNewBillingAddr({ customerName: "", address: "", gst: "" });
        setIsBillingAddrOpen(false);
        toast.success("Billing address added");
    };

    const handleAddShippingAddress = () => {
        if (!newShippingAddr.customerName.trim() || !newShippingAddr.address.trim()) {
            toast.error("Customer name and address are required");
            return;
        }
        form.setValue("shippingCustomerName", newShippingAddr.customerName);
        form.setValue("shippingAddress", newShippingAddr.address);
        form.setValue("shippingGst", newShippingAddr.gst);
        setNewShippingAddr({ customerName: "", address: "", gst: "" });
        setIsShippingAddrOpen(false);
        toast.success("Shipping address added");
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
                                        Billing Address
                                    </h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">Billing address from work order</p>
                                <div className="mb-4">
                                    <SelectField
                                        control={form.control}
                                        name="selectedBillingAddressId"
                                        label="Select Existing Billing Address"
                                        options={billingAddressOptions}
                                        placeholder="Choose billing address..."
                                    />
                                </div>
                                <div className="space-y-4">
                                    <FieldWrapper control={form.control} name="billingCustomerName" label={<><Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Customer Name <span className="text-destructive">*</span></>}>
                                        {(field) => <Input {...field} placeholder="Enter customer name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="billingAddress" label={<><MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Address <span className="text-destructive">*</span></>}>
                                        {(field) => <Textarea {...field} placeholder="Enter billing address" rows={3} />}
                                    </FieldWrapper>
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
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsBillingAddrOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add New Billing Address
                                    </Button>
                                    <AddAddressDialog
                                        open={isBillingAddrOpen}
                                        onOpenChange={setIsBillingAddrOpen}
                                        address={newBillingAddr}
                                        setAddress={setNewBillingAddr}
                                        onSubmit={handleAddBillingAddress}
                                        title="Add New Billing Address"
                                    />
                                </div>
                            </div>

                            <div className="border rounded-lg border-sidebar-primary-foreground border-dashed p-4 w-full md:w-1/2">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Shipping Address
                                    </h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">Shipping address from work order</p>
                                <div className="mb-4">
                                    <SelectField
                                        control={form.control}
                                        name="selectedShippingAddressId"
                                        label="Select Existing Shipping Address"
                                        options={shippingAddressOptions}
                                        placeholder="Choose shipping address..."
                                    />
                                </div>
                                <div className="space-y-4">
                                    <FieldWrapper control={form.control} name="shippingCustomerName" label={<><Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Customer Name <span className="text-destructive">*</span></>}>
                                        {(field) => <Input {...field} placeholder="Enter customer name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="shippingAddress" label={<><MapPin className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Address <span className="text-destructive">*</span></>}>
                                        {(field) => <Textarea {...field} placeholder="Enter shipping address" rows={3} />}
                                    </FieldWrapper>
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
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsShippingAddrOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add New Shipping Address
                                    </Button>
                                    <AddAddressDialog
                                        open={isShippingAddrOpen}
                                        onOpenChange={setIsShippingAddrOpen}
                                        address={newShippingAddr}
                                        setAddress={setNewShippingAddr}
                                        onSubmit={handleAddShippingAddress}
                                        title="Add New Shipping Address"
                                    />
                                </div>
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