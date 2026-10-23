import { paths } from "@/app/routes/paths";
import { AsyncSelectField } from "@/components/form/AsyncSelectField";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useProjectInventory } from "@/hooks/api/usePurchaseOrders";
import { useAddWoAddress, useCreateSaleInvoice, useWoBillingData } from "@/hooks/api/useSaleInvoices";
import { useCreateTransporter, useTransporterOptions } from "@/hooks/api/useTransporters";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    ListChecks,
    Loader2,
    Mail,
    MapPin,
    Plus,
    Truck,
    Trash2,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { InventoryItemCombobox } from "./components/InventoryItemCombobox";
import { TransporterDialog, type TransporterPayload } from "./components/TransporterDialog";
import { WoAddressDialog, type WoAddressPayload } from "./components/WoAddressDialog";
import { formatCurrency, formatDateForInput, mapSaleInvoiceFormToCreateDTO } from "./helpers/saleInvoice.mapper";
import {
    saleInvoiceFormSchema,
    stepOneFields,
    stepTwoFields,
    type SaleInvoiceFormValues,
} from "./helpers/saleInvoice.schema";
import type { ProjectInventoryItem } from "./helpers/saleInvoice.types";

const STEPS = [
    { id: 1, title: "Map Items", icon: ListChecks },
    { id: 2, title: "Addresses", icon: Truck },
    { id: 3, title: "Review", icon: ClipboardCheck },
] as const;

const defaultFormValues: SaleInvoiceFormValues = {
    invoiceDate: formatDateForInput(new Date()),
    selectedLineSrNos: [],
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
    transporterId: "",
    dispatchFromName: "",
    dispatchFromAddress: "",
    dispatchFromGst: "",
    dispatchVehicleNo: "",
    dispatchLrNo: "",
    dispatchToName: "",
    dispatchToAddress: "",
    dispatchToGst: "",
    freight: 0,
    otherCharges: 0,
    roundOff: 0,
    items: [],
    remarks: "",
};

const GST_OPTIONS = [
    { value: "0", label: "0%" },
    { value: "5", label: "5%" },
    { value: "12", label: "12%" },
    { value: "18", label: "18%" },
    { value: "28", label: "28%" },
];

const STEP_TWO_ERROR_KEYS = new Set([
    "invoiceDate",
    "billingCustomerName",
    "billingAddress",
    "billingGst",
    "billingEmail",
    "billingPanNo",
    "billingMsmeNo",
    "billingCinNo",
    "shippingCustomerName",
    "shippingAddress",
    "shippingGst",
    "shippingPanNo",
    "selectedBillingAddressId",
    "selectedShippingAddressId",
    "transporterId",
    "dispatchFromName",
    "dispatchFromAddress",
    "dispatchFromGst",
    "dispatchVehicleNo",
    "dispatchLrNo",
    "dispatchToName",
    "dispatchToAddress",
    "dispatchToGst",
]);

const STEP_THREE_ERROR_KEYS = new Set(["freight", "otherCharges", "roundOff", "remarks"]);

interface StepIndicatorProps {
    current: number;
    completed: number[];
    onSelect: (step: number) => void;
}

function StepIndicator({ current, completed, onSelect }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-center gap-0">
            {STEPS.map((step, i) => {
                const isDone = completed.includes(step.id) && step.id !== current;
                const isActive = step.id === current;
                const Icon = step.icon;
                const canSelect = step.id === current || step.id < current || completed.includes(step.id - 1);

                return (
                    <Fragment key={step.id}>
                        <button
                            type="button"
                            onClick={() => onSelect(step.id)}
                            disabled={!canSelect}
                            className={cn("flex flex-col items-center gap-1", canSelect ? "cursor-pointer" : "cursor-default")}
                            aria-current={isActive ? "step" : undefined}
                        >
                            <div
                                className={cn(
                                    "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors duration-300",
                                    isDone
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : isActive
                                          ? "border-primary text-primary bg-primary/10"
                                          : "border-border text-muted-foreground bg-background",
                                )}
                            >
                                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] font-medium hidden sm:block transition-colors",
                                    isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/60",
                                )}
                            >
                                {step.title}
                            </span>
                        </button>
                        {i < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    "h-0.5 w-12 sm:w-20 mb-4 mx-1 transition-colors duration-500",
                                    completed.includes(step.id) ? "bg-primary" : "bg-border",
                                )}
                            />
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}

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
    const addWoAddressMutation = useAddWoAddress();
    const createTransporterMutation = useCreateTransporter();

    const [step, setStep] = useState(1);
    const [completed, setCompleted] = useState<number[]>([]);
    const [woAddrDialog, setWoAddrDialog] = useState<"billing" | "shipping" | null>(null);
    const [isTransporterDialogOpen, setIsTransporterDialogOpen] = useState(false);
    const [dispatchSameAsShipping, setDispatchSameAsShipping] = useState(false);
    const [transporterQuery, setTransporterQuery] = useState("");

    const form = useForm<SaleInvoiceFormValues>({
        resolver: zodResolver(saleInvoiceFormSchema) as any,
        defaultValues: defaultFormValues,
        mode: "onChange",
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items" as any,
    });

    const fv = form.watch();
    const items = (fv.items ?? []) as any[];
    const selectedLineSrNos = fv.selectedLineSrNos ?? [];
    const selectedBillingAddressId = fv.selectedBillingAddressId ?? "";
    const selectedShippingAddressId = fv.selectedShippingAddressId ?? "";
    const transporterId = fv.transporterId ?? "";

    const hasBoq = (woBillingData?.billingBoq?.length ?? 0) > 0;
    const boqRows = woBillingData?.billingBoq ?? [];

    const inventoryItems = useMemo(
        () => (inventoryData?.items ?? []).filter((i: ProjectInventoryItem) => i.remainingQty > 0),
        [inventoryData],
    );

    const usedProductIds = useMemo(() => {
        const set = new Set<number>();
        items.forEach((it) => {
            if (it?.purchaseOrderProductId) set.add(Number(it.purchaseOrderProductId));
        });
        return set;
    }, [items]);

    const availableInventory = useMemo(
        () => inventoryItems.filter((i) => !usedProductIds.has(i.id)),
        [inventoryItems, usedProductIds],
    );

    const calculations = useMemo(() => {
        let subtotal = 0;
        let totalGst = 0;
        items.forEach((item) => {
            const qty = Number(item?.qty || 0);
            const rate = Number(item?.rate || 0);
            const gstRate = Number(item?.gstRate || 0);
            const lineTotal = qty * rate;
            subtotal += lineTotal;
            totalGst += (lineTotal * gstRate) / 100;
        });
        return { subtotal, totalGst };
    }, [items]);

    const grandTotal =
        calculations.subtotal +
        calculations.totalGst +
        Number(fv.freight || 0) +
        Number(fv.otherCharges || 0) +
        Number(fv.roundOff || 0);

    const groups = useMemo(() => {
        const srNos = hasBoq ? boqRows.filter((b) => selectedLineSrNos.includes(b.srNo)).map((b) => b.srNo) : [0];
        return srNos.map((srNo) => {
            const boq = hasBoq ? (boqRows.find((b) => b.srNo === srNo) ?? null) : null;
            const indexes: number[] = [];
            items.forEach((it, i) => {
                if (Number(it?.lineItemSrNo) === srNo) indexes.push(i);
            });
            return { srNo, boq, indexes };
        });
    }, [hasBoq, boqRows, selectedLineSrNos, items]);

    const billingAddressOptions = useMemo(
        () =>
            (woBillingData?.billingAddresses ?? []).map((a) => ({
                id: String(a.id),
                name: a.customerName,
                description: a.address,
            })),
        [woBillingData],
    );

    const shippingAddressOptions = useMemo(
        () =>
            (woBillingData?.shippingAddresses ?? []).map((a) => ({
                id: String(a.id),
                name: a.customerName,
                description: a.address,
            })),
        [woBillingData],
    );

    const debouncedTransporterQuery = useDebouncedSearch(transporterQuery);
    const transporterIdList = transporterId ? [Number(transporterId)] : [];
    const { data: transporterRows, isLoading: isTransporterLoading } = useTransporterOptions(
        debouncedTransporterQuery,
        transporterIdList,
    );
    const transporterOptions = useMemo(
        () =>
            (transporterRows ?? []).map((t) => ({
                id: String(t.id),
                name: t.name,
                description: [t.gstNo, t.phone].filter(Boolean).join(" · ") || undefined,
            })),
        [transporterRows],
    );
    const selectedTransporter = transporterRows?.find((t) => String(t.id) === transporterId);

    const lastAppliedBillingRef = useRef("");
    useEffect(() => {
        if (!selectedBillingAddressId) {
            lastAppliedBillingRef.current = "";
            return;
        }
        if (!woBillingData) return;
        const addr = woBillingData.billingAddresses?.find((a) => String(a.id) === selectedBillingAddressId);
        if (!addr) return;
        const key = `billing:${selectedBillingAddressId}`;
        if (lastAppliedBillingRef.current === key) return;
        lastAppliedBillingRef.current = key;
        form.setValue("billingCustomerName", addr.customerName || "");
        form.setValue("billingAddress", addr.address || "");
        form.setValue("billingGst", addr.gst || "");
    }, [selectedBillingAddressId, woBillingData, form]);

    const lastAppliedShippingRef = useRef("");
    useEffect(() => {
        if (!selectedShippingAddressId) {
            lastAppliedShippingRef.current = "";
            return;
        }
        if (!woBillingData) return;
        const addr = woBillingData.shippingAddresses?.find((a) => String(a.id) === selectedShippingAddressId);
        if (!addr) return;
        const key = `shipping:${selectedShippingAddressId}`;
        if (lastAppliedShippingRef.current === key) return;
        lastAppliedShippingRef.current = key;
        form.setValue("shippingCustomerName", addr.customerName || "");
        form.setValue("shippingAddress", addr.address || "");
        form.setValue("shippingGst", addr.gst || "");
    }, [selectedShippingAddressId, woBillingData, form]);

    useEffect(() => {
        if (isWoDataLoading || hasBoq) return;
        if (selectedLineSrNos.length > 0) return;
        form.setValue("selectedLineSrNos", [0]);
    }, [isWoDataLoading, hasBoq, selectedLineSrNos, form]);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [step]);

    const formErrors = form.formState.errors as any;
    const selectedLinesError = formErrors?.selectedLineSrNos?.message as string | undefined;
    const itemsRootError = formErrors?.items?.message as string | undefined;

    const rowErrorMessages = (index: number): string[] => {
        const row = formErrors?.items?.[index];
        if (!row) return [];
        return [row.lineItemSrNo?.message, row.purchaseOrderProductId?.message].filter(Boolean) as string[];
    };

    const toggleLine = (srNo: number, checked: boolean) => {
        const current = (form.getValues("selectedLineSrNos") || []) as number[];
        if (checked) {
            if (!current.includes(srNo)) form.setValue("selectedLineSrNos", [...current, srNo]);
        } else {
            form.setValue("selectedLineSrNos", current.filter((s) => s !== srNo));
            const rows = (form.getValues("items") as any[]) || [];
            const toRemove = rows
                .map((it, i) => ({ sr: Number(it?.lineItemSrNo), i }))
                .filter((x) => x.sr === srNo)
                .map((x) => x.i)
                .sort((a, b) => b - a);
            toRemove.forEach((i) => remove(i));
        }
        void form.trigger([...stepOneFields]);
    };

    const appendToLine = (srNo: number, item: ProjectInventoryItem) => {
        if (usedProductIds.has(item.id)) return;
        append({
            lineItemSrNo: srNo,
            itemDescription: item.description,
            qty: item.remainingQty,
            rate: item.rate,
            gstRate: item.gstRate,
            purchaseOrderProductId: item.id,
            unit: item.unit || "NOS",
            hsnSac: item.hsnSac || undefined,
        } as any);
        void form.trigger([...stepOneFields]);
    };

    const goNext = async () => {
        if (step === 1) {
            const ok = await form.trigger([...stepOneFields]);
            if (!ok) {
                toast.error("Please fix the highlighted fields before continuing.");
                return;
            }
            setCompleted((c) => (c.includes(1) ? c : [...c, 1]));
            setStep(2);
        } else if (step === 2) {
            const ok = await form.trigger([...stepTwoFields]);
            if (!ok) {
                toast.error("Please fill in all required address details.");
                return;
            }
            setCompleted((c) => (c.includes(2) ? c : [...c, 2]));
            setStep(3);
        }
    };

    const goBack = () => setStep((s) => Math.max(1, s - 1));

    const goToStep = (target: number) => {
        if (target === step) return;
        if (target < step || completed.includes(target - 1)) setStep(target);
    };

    const handleCreate = async (values: SaleInvoiceFormValues) => {
        try {
            const siData = mapSaleInvoiceFormToCreateDTO(values, projectId, woBillingData?.woDetailId);
            const result = await createSIMutation.mutateAsync(siData);
            toast.success(`Sale Invoice #${result.invoiceNumber} request created. Account team will prepare the draft.`);
            navigate(paths.operations.saleInvoices);
        } catch (error: any) {
            toast.error(error?.message || "Failed to create sale invoice. Please try again.");
        }
    };

    const handleCreateError = (errs: Record<string, any>) => {
        const keys = Object.keys(errs);
        const target = keys.some((k) => k === "items" || k === "selectedLineSrNos")
            ? 1
            : keys.some((k) => STEP_THREE_ERROR_KEYS.has(k))
              ? 3
              : keys.some((k) => STEP_TWO_ERROR_KEYS.has(k))
                ? 2
                : 2;
        setCompleted((c) => c.filter((s) => s < target));
        setStep(target);
        toast.error("Some fields need attention. Taking you back to fix them.");
    };

    const handleFinalSubmit = () => {
        form.handleSubmit(handleCreate, handleCreateError)();
    };

    const onFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (step === 3) handleFinalSubmit();
        else void goNext();
    };

    const handleAddWoAddress = async (type: "billing" | "shipping", data: WoAddressPayload) => {
        const woDetailId = woBillingData?.woDetailId;
        if (!woDetailId) {
            toast.error("Work order details are not available for this project.");
            return;
        }
        try {
            const created = await addWoAddressMutation.mutateAsync({ type, woDetailId, ...data });
            if (created?.id != null) {
                form.setValue(type === "billing" ? "selectedBillingAddressId" : "selectedShippingAddressId", String(created.id));
            }
            toast.success(`${type === "billing" ? "Billing" : "Shipping"} address added.`);
            setWoAddrDialog(null);
        } catch (error: any) {
            toast.error(error?.message || "Failed to add address. Please try again.");
        }
    };

    const handleCreateTransporter = async (data: TransporterPayload) => {
        try {
            const created = await createTransporterMutation.mutateAsync({
                name: data.name,
                gstNo: data.gstNo || null,
                phone: data.phone || null,
                address: data.address || null,
            });
            if (created?.id != null) form.setValue("transporterId", String(created.id));
            toast.success(`Transporter "${created.name}" added.`);
            setIsTransporterDialogOpen(false);
        } catch (error: any) {
            toast.error(error?.message || "Failed to add transporter. Please try again.");
        }
    };

    const handleDispatchSameAsShipping = (checked: boolean) => {
        setDispatchSameAsShipping(checked);
        if (checked) {
            form.setValue("dispatchToName", form.getValues("shippingCustomerName"));
            form.setValue("dispatchToAddress", form.getValues("shippingAddress"));
            form.setValue("dispatchToGst", form.getValues("shippingGst"));
        }
    };

    const groupAmount = (indexes: number[]) =>
        indexes.reduce((sum, i) => sum + Number(items[i]?.qty || 0) * Number(items[i]?.rate || 0), 0);

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
                        {overview?.project?.projectName && (
                            <p className="text-sm text-muted-foreground mt-1">{overview.project.projectName}</p>
                        )}
                    </div>
                    <CardAction>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex items-center space-x-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Go Back</span>
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <StepIndicator current={step} completed={completed} onSelect={goToStep} />
                <Form {...form}>
                    <form onSubmit={onFormSubmit}>
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div>
                                            <h4 className="font-semibold text-base text-primary flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                {hasBoq ? "WO Billing BOQ Line Items" : "Line Items"}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">
                                                {hasBoq
                                                    ? "Select the billing lines to invoice, then map approved PO inventory to each line."
                                                    : "This project has no WO Billing BOQ — map approved PO inventory directly."}
                                            </p>
                                        </div>
                                        <Badge variant="secondary">
                                            {fields.length} {fields.length === 1 ? "item" : "items"} mapped
                                        </Badge>
                                    </div>

                                    {hasBoq && (
                                        <div className="rounded-md border overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[6%]"></TableHead>
                                                        <TableHead className="w-[8%]">SR</TableHead>
                                                        <TableHead className="w-[46%]">Description</TableHead>
                                                        <TableHead className="w-[12%] text-right">BOQ Qty</TableHead>
                                                        <TableHead className="w-[14%] text-right">Rate</TableHead>
                                                        <TableHead className="w-[14%] text-right">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {boqRows.map((b) => {
                                                        const checked = selectedLineSrNos.includes(b.srNo);
                                                        return (
                                                            <TableRow
                                                                key={b.id}
                                                                className={cn(checked && "bg-primary/5 hover:bg-primary/10")}
                                                            >
                                                                <TableCell>
                                                                    <Checkbox
                                                                        checked={checked}
                                                                        onCheckedChange={(v) => toggleLine(b.srNo, v === true)}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm">{b.srNo}</TableCell>
                                                                <TableCell className="text-sm">{b.itemDescription}</TableCell>
                                                                <TableCell className="text-right tabular-nums">{b.quantity}</TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {formatCurrency(Number(b.rate || 0))}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums font-medium">
                                                                    {b.amount ? formatCurrency(Number(b.amount)) : "-"}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                    {boqRows.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                                No billing BOQ lines found.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}

                                    {selectedLinesError && (
                                        <p className="text-sm text-destructive flex items-start gap-1.5">
                                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                            {selectedLinesError}
                                        </p>
                                    )}
                                    {!selectedLinesError && itemsRootError && (
                                        <p className="text-sm text-destructive flex items-start gap-1.5">
                                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                            {itemsRootError}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {groups.map((g) => (
                                        <div key={g.srNo} className="rounded-lg border p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                <div>
                                                    <h5 className="font-semibold text-sm">
                                                        {hasBoq ? `Line ${g.srNo}` : "Mapped Items"}
                                                        {g.boq ? ` — ${g.boq.itemDescription}` : ""}
                                                    </h5>
                                                    {g.boq && (
                                                        <p className="text-xs text-muted-foreground">
                                                            BOQ Qty {g.boq.quantity} × Rate{" "}
                                                            {formatCurrency(Number(g.boq.rate || 0))}
                                                            {g.boq.amount ? ` = ${formatCurrency(Number(g.boq.amount))}` : ""}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant="outline">
                                                    {g.indexes.length} mapped · {formatCurrency(groupAmount(g.indexes))}
                                                </Badge>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium">Add PO inventory item</label>
                                                <InventoryItemCombobox
                                                    items={availableInventory}
                                                    onSelect={(inv) => appendToLine(g.srNo, inv)}
                                                    disabled={availableInventory.length === 0}
                                                    placeholder={
                                                        availableInventory.length === 0
                                                            ? "All available PO items are mapped"
                                                            : "Choose an item to add..."
                                                    }
                                                />
                                            </div>

                                            <div className="rounded-md border overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[5%]">#</TableHead>
                                                            <TableHead className="w-[40%]">PO Item</TableHead>
                                                            <TableHead className="w-[10%]">Qty *</TableHead>
                                                            <TableHead className="w-[12%]">Rate (₹) *</TableHead>
                                                            <TableHead className="w-[9%]">GST %</TableHead>
                                                            <TableHead className="w-[14%] text-right">Amount</TableHead>
                                                            <TableHead className="w-[5%]"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {g.indexes.length === 0 && (
                                                            <TableRow>
                                                                <TableCell
                                                                    colSpan={7}
                                                                    className="text-center py-6 text-sm text-muted-foreground"
                                                                >
                                                                    No PO items mapped to this line yet.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                        {g.indexes.map((index, rowIndex) => {
                                                            const item = items[index] ?? {};
                                                            const linkedItem = item.purchaseOrderProductId
                                                                ? (inventoryData?.items ?? []).find(
                                                                      (i: ProjectInventoryItem) => i.id === item.purchaseOrderProductId,
                                                                  )
                                                                : undefined;
                                                            const qty = Number(item?.qty ?? 0);
                                                            const rate = Number(item?.rate ?? 0);
                                                            const rowIssues = rowErrorMessages(index);
                                                            return (
                                                                <TableRow key={fields[index]?.id ?? index} className="group">
                                                                    <TableCell className="text-muted-foreground font-medium align-top pt-4">
                                                                        {rowIndex + 1}
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper
                                                                            control={form.control}
                                                                            name={`items.${index}.itemDescription` as any}
                                                                            label=""
                                                                        >
                                                                            {(fieldProps) => (
                                                                                <Textarea
                                                                                    readOnly
                                                                                    {...fieldProps}
                                                                                    rows={2}
                                                                                    className="min-h-[36px]"
                                                                                />
                                                                            )}
                                                                        </FieldWrapper>
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                            {linkedItem && (
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="text-[10px] font-mono"
                                                                                >
                                                                                    PO: {linkedItem.poNumber}
                                                                                </Badge>
                                                                            )}
                                                                            {linkedItem && (
                                                                                <span className="text-[10px] text-muted-foreground">
                                                                                    Remaining: {linkedItem.remainingQty}{" "}
                                                                                    {linkedItem.unit || "NOS"}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {rowIssues.map((msg) => (
                                                                            <p key={msg} className="text-xs text-destructive mt-1">
                                                                                {msg}
                                                                            </p>
                                                                        ))}
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <FieldWrapper
                                                                            control={form.control}
                                                                            name={`items.${index}.qty` as any}
                                                                            label=""
                                                                        >
                                                                            {(fieldProps) => (
                                                                                <NumberInput
                                                                                    value={fieldProps.value}
                                                                                    onChange={(v) => {
                                                                                        const next = Number(v ?? 0);
                                                                                        if (linkedItem && next > linkedItem.remainingQty) {
                                                                                            toast.error(
                                                                                                `Quantity cannot exceed remaining PO qty (${linkedItem.remainingQty})`,
                                                                                            );
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
                                                                        <FieldWrapper
                                                                            control={form.control}
                                                                            name={`items.${index}.rate` as any}
                                                                            label=""
                                                                        >
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
                                                                            options={GST_OPTIONS}
                                                                            placeholder="GST"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="p-1 text-right align-top pt-4 font-medium tabular-nums">
                                                                        {qty > 0 && rate > 0 ? formatCurrency(qty * rate) : "-"}
                                                                    </TableCell>
                                                                    <TableCell className="p-1 align-top pt-2">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                                                                            onClick={() => remove(index)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-lg border bg-muted/30 p-4 flex flex-wrap justify-between gap-6">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Subtotal (Pre-GST)</p>
                                        <p className="font-semibold tabular-nums">{formatCurrency(calculations.subtotal)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">GST</p>
                                        <p className="font-semibold tabular-nums text-blue-600">
                                            {formatCurrency(calculations.totalGst)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                        <p className="font-bold tabular-nums">
                                            {formatCurrency(calculations.subtotal + calculations.totalGst)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="max-w-xs">
                                    <FieldWrapper
                                        control={form.control}
                                        name="invoiceDate"
                                        label={
                                            <>
                                                Invoice Date <span className="text-destructive">*</span>
                                            </>
                                        }
                                    >
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="border rounded-lg border-primary border-dashed p-4 space-y-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <Building2 className="h-5 w-5" />
                                                Billing Address
                                            </h3>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setWoAddrDialog("billing")}
                                                disabled={!woBillingData?.woDetailId}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add New
                                            </Button>
                                        </div>
                                        <SelectField
                                            control={form.control}
                                            name="selectedBillingAddressId"
                                            label="Saved billing addresses"
                                            options={billingAddressOptions}
                                            placeholder="Choose an address..."
                                            valueType="string"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Pick a saved address or add a new one — details below are pre-filled and stay editable.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                            <FieldWrapper
                                                control={form.control}
                                                name="billingCustomerName"
                                                label={
                                                    <>
                                                        Customer Name <span className="text-destructive">*</span>
                                                    </>
                                                }
                                            >
                                                {(field) => <Input {...field} placeholder="Enter customer name" />}
                                            </FieldWrapper>
                                            <FieldWrapper
                                                control={form.control}
                                                name="billingAddress"
                                                label={
                                                    <>
                                                        Address <span className="text-destructive">*</span>
                                                    </>
                                                }
                                            >
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
                                            <FieldWrapper
                                                control={form.control}
                                                name="billingEmail"
                                                label={
                                                    <>
                                                        <Mail className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                                        Email
                                                    </>
                                                }
                                            >
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
                                            <FieldWrapper
                                                control={form.control}
                                                name="billingCinNo"
                                                label={
                                                    <>
                                                        <Building2 className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                                        CIN Number
                                                    </>
                                                }
                                            >
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

                                    <div className="border rounded-lg border-dashed p-4 space-y-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <MapPin className="h-5 w-5" />
                                                Shipping Address
                                            </h3>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setWoAddrDialog("shipping")}
                                                disabled={!woBillingData?.woDetailId}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add New
                                            </Button>
                                        </div>
                                        <SelectField
                                            control={form.control}
                                            name="selectedShippingAddressId"
                                            label="Saved shipping addresses"
                                            options={shippingAddressOptions}
                                            placeholder="Choose an address..."
                                            valueType="string"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Delivery destination — pick a saved address or add a new one.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                            <FieldWrapper
                                                control={form.control}
                                                name="shippingCustomerName"
                                                label={
                                                    <>
                                                        Customer Name <span className="text-destructive">*</span>
                                                    </>
                                                }
                                            >
                                                {(field) => <Input {...field} placeholder="Enter customer name" />}
                                            </FieldWrapper>
                                            <FieldWrapper
                                                control={form.control}
                                                name="shippingAddress"
                                                label={
                                                    <>
                                                        Address <span className="text-destructive">*</span>
                                                    </>
                                                }
                                            >
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
                                </div>

                                <div className="border rounded-lg border-dashed p-4 space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <Truck className="h-5 w-5" />
                                            Transporter
                                        </h3>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setIsTransporterDialogOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add New
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                        <AsyncSelectField
                                            control={form.control}
                                            name="transporterId"
                                            label="Select transporter"
                                            options={transporterOptions}
                                            placeholder="Choose a transporter..."
                                            onSearch={setTransporterQuery}
                                            isLoading={isTransporterLoading}
                                            valueType="string"
                                        />
                                        <p className="text-sm text-muted-foreground md:pt-8">
                                            Transporter details are stored with the invoice at creation time. Vehicle and LR numbers can
                                            still be edited below.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-base text-primary flex items-center gap-2">
                                        <ClipboardCheck className="h-4 w-4" />
                                        Review & Totals
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Check the mapped lines, addresses and totals before creating the invoice request.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="rounded-lg border p-4 space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase">Billing</p>
                                        <p className="text-sm font-medium">{fv.billingCustomerName || "—"}</p>
                                        <p className="text-xs text-muted-foreground break-words">{fv.billingAddress || "—"}</p>
                                        {fv.billingGst && <p className="text-xs font-mono">{fv.billingGst}</p>}
                                    </div>
                                    <div className="rounded-lg border p-4 space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase">Shipping</p>
                                        <p className="text-sm font-medium">{fv.shippingCustomerName || "—"}</p>
                                        <p className="text-xs text-muted-foreground break-words">{fv.shippingAddress || "—"}</p>
                                        {fv.shippingGst && <p className="text-xs font-mono">{fv.shippingGst}</p>}
                                    </div>
                                    <div className="rounded-lg border p-4 space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase">Transporter & Dispatch</p>
                                        <p className="text-sm font-medium">{selectedTransporter?.name || "No transporter selected"}</p>
                                        {(fv.dispatchVehicleNo || fv.dispatchLrNo) && (
                                            <p className="text-xs text-muted-foreground">
                                                {fv.dispatchVehicleNo && `Vehicle: ${fv.dispatchVehicleNo}`}
                                                {fv.dispatchVehicleNo && fv.dispatchLrNo && " · "}
                                                {fv.dispatchLrNo && `LR: ${fv.dispatchLrNo}`}
                                            </p>
                                        )}
                                        {fv.dispatchToName && (
                                            <p className="text-xs text-muted-foreground">To: {fv.dispatchToName}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {groups.map((g) => (
                                        <div key={g.srNo} className="rounded-lg border overflow-hidden">
                                            <div className="bg-muted/50 px-4 py-2 flex items-center justify-between gap-3">
                                                <span className="font-medium text-sm">
                                                    {hasBoq ? `Line ${g.srNo} — ${g.boq?.itemDescription ?? ""}` : "Line Items"}
                                                </span>
                                                <span className="text-sm font-medium tabular-nums">
                                                    {formatCurrency(groupAmount(g.indexes))}
                                                </span>
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[8%]">SR</TableHead>
                                                        <TableHead className="w-[40%]">PO Item</TableHead>
                                                        <TableHead className="w-[12%] text-right">Qty</TableHead>
                                                        <TableHead className="w-[13%] text-right">Rate</TableHead>
                                                        <TableHead className="w-[9%] text-right">GST</TableHead>
                                                        <TableHead className="w-[18%] text-right">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {g.indexes.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground text-sm">
                                                                No items mapped to this line.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                    {g.indexes.map((index) => {
                                                        const item = items[index] ?? {};
                                                        const linkedItem = item.purchaseOrderProductId
                                                            ? (inventoryData?.items ?? []).find(
                                                                  (i: ProjectInventoryItem) => i.id === item.purchaseOrderProductId,
                                                              )
                                                            : undefined;
                                                        const qty = Number(item?.qty ?? 0);
                                                        const rate = Number(item?.rate ?? 0);
                                                        return (
                                                            <TableRow key={fields[index]?.id ?? index}>
                                                                <TableCell className="font-mono text-sm">{g.srNo || "—"}</TableCell>
                                                                <TableCell className="text-sm">
                                                                    <span className="block">{item.itemDescription}</span>
                                                                    {linkedItem && (
                                                                        <Badge variant="secondary" className="text-[10px] font-mono mt-1">
                                                                            PO: {linkedItem.poNumber}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {qty} {item.unit || ""}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {formatCurrency(rate)}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {Number(item?.gstRate || 0)}%
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums font-medium">
                                                                    {formatCurrency(qty * rate)}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="rounded-lg border p-4 space-y-4">
                                        <h4 className="font-semibold text-sm">Additional Charges & Notes</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FieldWrapper control={form.control} name="freight" label="Freight (₹)">
                                                {(field) => (
                                                    <NumberInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        min={0}
                                                        step={0.01}
                                                        placeholder="0"
                                                        className="text-right"
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="otherCharges" label="Other Charges (₹)">
                                                {(field) => (
                                                    <NumberInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        min={0}
                                                        step={0.01}
                                                        placeholder="0"
                                                        className="text-right"
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="roundOff" label="Round Off (₹)">
                                                {(field) => (
                                                    <NumberInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        step={0.01}
                                                        placeholder="0"
                                                        className="text-right"
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>
                                        <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                            {(field) => <Textarea {...field} placeholder="Any additional notes..." rows={3} />}
                                        </FieldWrapper>
                                    </div>

                                    <div className="rounded-lg border p-4 space-y-2 h-fit">
                                        <h4 className="font-semibold text-sm mb-2">Totals</h4>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Subtotal (Pre-GST)</span>
                                            <span className="tabular-nums">{formatCurrency(calculations.subtotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">GST</span>
                                            <span className="tabular-nums text-blue-600">
                                                {formatCurrency(calculations.totalGst)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Freight</span>
                                            <span className="tabular-nums">{formatCurrency(Number(fv.freight || 0))}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Other Charges</span>
                                            <span className="tabular-nums">{formatCurrency(Number(fv.otherCharges || 0))}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Round Off</span>
                                            <span className="tabular-nums">{formatCurrency(Number(fv.roundOff || 0))}</span>
                                        </div>
                                        <div className="border-t pt-2 flex items-center justify-between">
                                            <span className="font-bold">Grand Total</span>
                                            <span className="font-bold text-lg tabular-nums">{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 pt-6 mt-8 border-t">
                            <div>
                                {step > 1 ? (
                                    <Button type="button" variant="outline" onClick={goBack}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back
                                    </Button>
                                ) : (
                                    <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {step < 3 ? (
                                    <Button type="button" onClick={goNext} className="min-w-[160px]">
                                        Continue
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleFinalSubmit}
                                        disabled={createSIMutation.isPending}
                                        className="min-w-[200px]"
                                    >
                                        {createSIMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Sale Invoice
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </Form>

                <WoAddressDialog
                    open={woAddrDialog === "billing"}
                    onOpenChange={(open) => {
                        if (!open) setWoAddrDialog(null);
                    }}
                    type="billing"
                    onSubmit={(data) => void handleAddWoAddress("billing", data)}
                    isLoading={addWoAddressMutation.isPending}
                />
                <WoAddressDialog
                    open={woAddrDialog === "shipping"}
                    onOpenChange={(open) => {
                        if (!open) setWoAddrDialog(null);
                    }}
                    type="shipping"
                    onSubmit={(data) => void handleAddWoAddress("shipping", data)}
                    isLoading={addWoAddressMutation.isPending}
                />
                <TransporterDialog
                    open={isTransporterDialogOpen}
                    onOpenChange={setIsTransporterDialogOpen}
                    onSubmit={(data) => void handleCreateTransporter(data)}
                    isLoading={createTransporterMutation.isPending}
                />
            </CardContent>
        </Card>
    );
}
