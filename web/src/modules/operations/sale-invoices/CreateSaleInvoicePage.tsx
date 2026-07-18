import { paths } from "@/app/routes/paths";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWoBillingData, useCreateSaleInvoice } from "@/hooks/api/useSaleInvoices";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Building2, Calendar, Copy, Eye, FileText, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AddAddressDialog } from "./components/AddAddressDialog";
import { SIFormPreview } from "./components/SIFormPreview";
import { formatDateForInput, formatCurrency, mapSaleInvoiceFormToCreateDTO } from "./helpers/saleInvoice.mapper";
import { saleInvoiceFormSchema, type SaleInvoiceFormValues } from "./helpers/saleInvoice.schema";
import type { WoBillingAddress, WoShippingAddress } from "./helpers/saleInvoice.types";

const defaultFormValues: SaleInvoiceFormValues = {
    invoiceDate: formatDateForInput(new Date()),
    billingCustomerName: "",
    billingAddress: "",
    billingGst: "",
    shippingCustomerName: "",
    shippingAddress: "",
    shippingGst: "",
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
    const createSIMutation = useCreateSaleInvoice();

    const [showPreview, setShowPreview] = useState(false);

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

    useEffect(() => {
        if (!woBillingData?.billingBoq?.length) return;
        if (fields.length > 0) return;

        const boqItems = (woBillingData.billingBoq || []).map((item: any) => ({
            srNo: item.srNo,
            itemDescription: item.itemDescription,
            qty: Number(item.quantity),
            rate: Number(item.rate),
            gstRate: 18,
        }));
        boqItems.forEach((item: any) => append(item));
    }, [woBillingData]);

    const addItem = () => {
        append({ itemDescription: "", qty: null, rate: null, gstRate: 18 });
    };

    const duplicateItem = (index: number) => {
        const source = items[index];
        if (!source) return;
        append({ ...source } as any);
    };

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

    const handleBillingSelect = (value: string) => {
        const addr = (woBillingData?.billingAddresses || []).find((a: WoBillingAddress) => String(a.id) === value);
        if (addr) {
            form.setValue("billingCustomerName", addr.customerName);
            form.setValue("billingAddress", addr.address);
            form.setValue("billingGst", addr.gst || "");
        }
    };

    const handleShippingSelect = (value: string) => {
        const addr = (woBillingData?.shippingAddresses || []).find((a: WoShippingAddress) => String(a.id) === value);
        if (addr) {
            form.setValue("shippingCustomerName", addr.customerName);
            form.setValue("shippingAddress", addr.address);
            form.setValue("shippingGst", addr.gst || "");
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
            toast.success(`Sale Invoice #${result.invoiceNumber} has been created successfully.`);
            navigate(paths.operations.projectDashboard(projectId));
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
                        <CardTitle>Request for Sale Invoice (OE)</CardTitle>
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
            <CardContent className="space-y-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="rounded-lg border p-4 mb-4 max-w-xs">
                            <FieldWrapper control={form.control} name="invoiceDate" label={<><Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />Invoice Date <span className="text-destructive">*</span></>}>
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                        </div>

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
                                        Select line items from the work order or add new ones
                                    </p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Item
                                </Button>
                            </div>

                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[5%]">#</TableHead>
                                            <TableHead className="w-[45%]">Description *</TableHead>
                                            <TableHead className="w-[10%]">Qty *</TableHead>
                                            <TableHead className="w-[12%]">Rate (₹) *</TableHead>
                                            <TableHead className="w-[8%]">GST %</TableHead>
                                            <TableHead className="w-[12%] text-right">Amount</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => {
                                            const item = items[index];
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
                                                                <Textarea {...fieldProps} placeholder="Enter description" rows={2} className="min-h-[36px]" />
                                                            )}
                                                        </FieldWrapper>
                                                    </TableCell>
                                                    <TableCell className="p-1 align-top pt-2">
                                                        <FieldWrapper control={form.control} name={`items.${index}.qty` as any} label="">
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
                                                        <FieldWrapper control={form.control} name={`items.${index}.gstRate` as any} label="">
                                                            {(fieldProps) => (
                                                                <Select
                                                                    value={String(fieldProps.value ?? 18)}
                                                                    onValueChange={(v) => fieldProps.onChange(Number(v))}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="0">0%</SelectItem>
                                                                        <SelectItem value="5">5%</SelectItem>
                                                                        <SelectItem value="12">12%</SelectItem>
                                                                        <SelectItem value="18">18%</SelectItem>
                                                                        <SelectItem value="28">28%</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </FieldWrapper>
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
                                                                            onClick={() => duplicateItem(index)}
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
                                                                                onClick={() => remove(index)}
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
                                                    No items added yet. Click "Add Item" or they will be pre-filled from the work order.
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
                                    <Label>Select Existing Billing Address</Label>
                                    <Select onValueChange={handleBillingSelect}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose billing address..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {billingAddressOptions.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    <Label>Select Existing Shipping Address</Label>
                                    <Select onValueChange={handleShippingSelect}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose shipping address..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {shippingAddressOptions.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
