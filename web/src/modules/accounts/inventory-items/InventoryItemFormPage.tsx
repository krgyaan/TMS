import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateInventoryItem, useInventoryItem, useItemConversionOptions, useUpdateInventoryItem } from "@/hooks/api/useInventoryItems";
import { handleQueryError } from "@/lib/react-query";
import { paths } from "@/app/routes/paths";
import type { InventoryItemPayload } from "@/types/inventory-item.types";
import { categoryOptions, getCategory, UNIT_OPTIONS, type Unit } from "./item-config";
import { inventoryItemFormSchema, type InventoryItemFormValues } from "./item-form-schema";

const formControlClass = "h-11 w-full rounded-md border border-slate-400 bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-600 md:h-10";
const sectionClass = "space-y-4 rounded-lg border bg-card p-4 sm:p-5";
const formatPreview = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 6 });
const normalizeFactorText = (value: string) => value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;

export default function InventoryItemFormPage() {
    const { id: rawId } = useParams<{ id: string }>();
    const itemId = rawId ? Number(rawId) : 0;
    const isEdit = Boolean(rawId);
    const navigate = useNavigate();
    const form = useForm<InventoryItemFormValues>({
        resolver: zodResolver(inventoryItemFormSchema) as never,
        defaultValues: { itemName: "", itemType: "", specifications: {}, description: "", unit: "Nos.", conversionUnit: "", conversionFactor: "", hsnCode: "", isActive: true },
    });
    const { data: item, isLoading: itemLoading, error: itemError, refetch } = useInventoryItem("master", itemId);
    const createItem = useCreateInventoryItem();
    const updateItem = useUpdateInventoryItem();
    const submissionLock = useRef(false);
    const allowNavigation = useRef(false);
    const historyGuardAdded = useRef(false);
    const formUrl = useRef(window.location.href);
    const lastWidth = useRef("");
    const initializedForm = useRef("");
    const [unitChangedNotice, setUnitChangedNotice] = useState(false);
    const unit = useWatch({ control: form.control, name: "unit" });
    const itemName = useWatch({ control: form.control, name: "itemName" });
    const conversionUnit = useWatch({ control: form.control, name: "conversionUnit" });
    const conversionFactor = useWatch({ control: form.control, name: "conversionFactor" });
    const width = useWatch({ control: form.control, name: "specifications.width" }) || "";
    const isDirty = form.formState.isDirty;
    const category = getCategory(itemName);
    const conversionOptionsQuery = useItemConversionOptions(unit, width);
    const conversionOptions = conversionOptionsQuery.data || [];
    const selectedConversion = conversionOptions.find(option => option.to === conversionUnit);
    const saving = createItem.isPending || updateItem.isPending;

    useEffect(() => {
        if (isEdit) {
            if (!item || initializedForm.current === `edit-${itemId}`) return;
            form.reset({
                itemName: item.itemName, itemType: item.itemType || "",
                specifications: item.specifications || {}, description: item.description || "",
                unit: item.unit as Unit, conversionUnit: item.conversionUnit || "",
                conversionFactor: item.conversionFactor || "", hsnCode: item.hsnCode || "", isActive: item.isActive,
            });
            lastWidth.current = item.specifications?.width || "";
            initializedForm.current = `edit-${itemId}`;
            formUrl.current = window.location.href;
            setUnitChangedNotice(false);
        } else if (initializedForm.current !== "new") {
            form.reset({
                itemName: "", itemType: "", specifications: {}, description: "", unit: "Nos.",
                conversionUnit: "", conversionFactor: "", hsnCode: "", isActive: true,
            });
            lastWidth.current = "";
            initializedForm.current = "new";
            formUrl.current = window.location.href;
            setUnitChangedNotice(false);
        }
    }, [isEdit, itemId, item, form]);

    useEffect(() => {
        if (width !== (form.getValues("specifications.width") || "") || width === lastWidth.current) return;
        if (conversionUnit && conversionOptionsQuery.isLoading) return;
        if (selectedConversion?.factorMode === "width" && selectedConversion.factor !== null) {
            form.setValue("conversionFactor", String(selectedConversion.factor), { shouldDirty: true, shouldValidate: true });
        }
        lastWidth.current = width;
    }, [width, conversionUnit, selectedConversion, conversionOptionsQuery.isLoading, form]);

    useEffect(() => {
        if (isDirty && !historyGuardAdded.current) {
            window.history.pushState({ ...(window.history.state || {}), itemMasterFormGuard: true }, "", formUrl.current);
            historyGuardAdded.current = true;
        }
        const handlePopState = (event: PopStateEvent) => {
            if (allowNavigation.current) {
                allowNavigation.current = false;
                historyGuardAdded.current = false;
                return;
            }
            if (!historyGuardAdded.current) return;
            event.stopImmediatePropagation();
            if (isDirty && !window.confirm("Discard unsaved item changes?")) {
                window.history.pushState({ ...(window.history.state || {}), itemMasterFormGuard: true }, "", formUrl.current);
                return;
            }
            allowNavigation.current = true;
            window.history.back();
        };
        window.addEventListener("popstate", handlePopState, true);
        return () => window.removeEventListener("popstate", handlePopState, true);
    }, [isDirty]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty || allowNavigation.current) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const leavePage = () => {
        if (isDirty && !window.confirm("Discard unsaved item changes?")) return;
        allowNavigation.current = true;
        navigate(paths.master.itemMaster, { replace: true });
    };

    const handleUnitChange = (nextUnit: Unit) => {
        if (nextUnit !== unit) {
            form.setValue("unit", nextUnit, { shouldDirty: true, shouldValidate: true });
            form.setValue("conversionUnit", "", { shouldDirty: true, shouldValidate: true });
            form.setValue("conversionFactor", "", { shouldDirty: true, shouldValidate: true });
            lastWidth.current = width;
            setUnitChangedNotice(true);
            form.clearErrors(["conversionUnit", "conversionFactor"]);
        }
    };

    const handleConversionChange = (nextUnit: string) => {
        form.setValue("conversionUnit", nextUnit, { shouldDirty: true, shouldValidate: true });
        const option = conversionOptions.find(candidate => candidate.to === nextUnit);
        form.setValue("conversionFactor", option?.factor === null || option?.factor === undefined ? "" : String(option.factor), { shouldDirty: true, shouldValidate: true });
    };

    const onValid = async (values: InventoryItemFormValues) => {
        if (submissionLock.current) return;
        submissionLock.current = true;
        try {
            const selectedOption = conversionOptions.find(option => option.to === values.conversionUnit);
            if (values.conversionUnit && !selectedOption) {
                form.setError("conversionUnit", { type: "validate", message: "This stored conversion is not an allowed pair. Choose another target or No conversion." });
                return;
            }
            if (selectedOption?.factorMode === "manual" && (!/^(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(normalizeFactorText(values.conversionFactor)) || Number(values.conversionFactor) <= 0)) {
                form.setError("conversionFactor", { type: "validate", message: "Enter a positive factor with up to 6 decimals." });
                return;
            }
            const payload: InventoryItemPayload = {
                itemName: values.itemName, itemType: values.itemType.trim() || null,
                specifications: values.specifications, description: values.description.trim() || null,
                unit: values.unit, conversionUnit: values.conversionUnit || null,
                conversionFactor: values.conversionUnit ? values.conversionFactor : null,
                hsnCode: values.hsnCode.trim() || null, isActive: values.isActive,
            };
            if (isEdit) await updateItem.mutateAsync({ id: itemId, data: payload });
            else await createItem.mutateAsync(payload);
            allowNavigation.current = true;
            navigate(paths.master.itemMaster, { replace: true });
        } catch (error) {
            form.setError("root.server", { message: handleQueryError(error) });
        } finally {
            submissionLock.current = false;
        }
    };

    const onInvalid = () => {
        requestAnimationFrame(() => {
            const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
            firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
            firstInvalid?.focus({ preventScroll: true });
        });
    };

    if (isEdit && (!Number.isInteger(itemId) || itemId <= 0)) return <Card><CardHeader><CardTitle>Item not found</CardTitle><CardDescription>Invalid item identifier.</CardDescription></CardHeader></Card>;
    if (isEdit && itemLoading) return <Card><CardHeader><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>;
    if (isEdit && (itemError || !item)) return <Card><CardHeader><CardTitle>Edit Item</CardTitle><CardDescription>Unable to load this item.</CardDescription></CardHeader><CardContent><Alert variant="destructive" className="mb-4"><AlertDescription>{itemError instanceof Error ? itemError.message : "Item not found."}</AlertDescription></Alert><Button variant="outline" onClick={() => void refetch()}>Retry</Button></CardContent></Card>;

    const errors = form.formState.errors;
    const errorMessage = errors.root?.server?.message;
    const storedWidthMismatch = Boolean(item && item.conversionUnit === conversionUnit && unit === item.unit && item.specifications?.width === width && selectedConversion?.factorMode === "width" && Number(item.conversionFactor) !== Number(selectedConversion.factor));
    const storedFixedMismatch = Boolean(item && item.conversionUnit === conversionUnit && selectedConversion?.factorMode === "fixed" && Number(item.conversionFactor) !== Number(selectedConversion.factor));
    const storedPairInvalid = Boolean(item?.conversionUnit && conversionUnit === item.conversionUnit && unit === item.unit && !conversionOptions.some(option => option.to === conversionUnit) && !conversionOptionsQuery.isLoading);
    const factorNumber = Number(conversionFactor);
    const showPreview = conversionUnit && Number.isFinite(factorNumber) && factorNumber > 0;

    return <div className="space-y-4 pb-28">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm text-muted-foreground">Settings / Item Master</p><h1 className="text-2xl font-semibold">{isEdit ? "Edit Item" : "Add Item"}</h1><p className="text-sm text-muted-foreground">{isEdit && item ? item.itemCode : "Create a shared item."}</p></div>
            <Button type="button" variant="outline" className="min-h-11" onClick={leavePage}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </div>
        {(errorMessage || (isEdit && itemError)) && <Alert variant="destructive"><AlertDescription>{errorMessage || (itemError instanceof Error ? itemError.message : "Unable to save item.")}</AlertDescription></Alert>}
        <form
            onSubmit={event => event.preventDefault()}
            onKeyDown={event => {
                const target = event.target as HTMLInputElement;
                if (event.key === "Enter" && target.tagName === "INPUT" && target.type !== "checkbox" && target.type !== "submit") event.preventDefault();
            }}
            className="space-y-4"
        >
            <section className={sectionClass}>
                <div><h2 className="font-semibold">Item details</h2><p className="text-sm text-muted-foreground">Choose the item family.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Item name" required helper="Select the item family." error={errors.itemName?.message}>
                        <select className={formControlClass} aria-invalid={Boolean(errors.itemName)} {...form.register("itemName", { onChange: event => {
                            if (event.target.value !== itemName) {
                                form.setValue("itemType", "", { shouldDirty: true });
                                form.setValue("specifications", {}, { shouldDirty: true });
                            }
                        } })}><option value="">Select item family</option>{categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                    </FormField>
                    {category?.types ? <FormField label="Type" helper="Select a type for this item." error={errors.itemType?.message}>
                        <select className={formControlClass} aria-invalid={Boolean(errors.itemType)} {...form.register("itemType")}><option value="">Select type</option>{category.types.map(type => <option key={type} value={type}>{type}</option>)}</select>
                    </FormField> : <FormField label="Type" helper="Enter the item type if one applies." error={errors.itemType?.message}><Input maxLength={80} className={formControlClass} aria-invalid={Boolean(errors.itemType)} {...form.register("itemType")} /></FormField>}
                    <FormField label="HSN code" helper="Optional tax classification code." error={errors.hsnCode?.message}><Input maxLength={30} className={formControlClass} aria-invalid={Boolean(errors.hsnCode)} {...form.register("hsnCode")} /></FormField>
                </div>
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Specifications</h2><p className="text-sm text-muted-foreground">Add the measurable or descriptive properties for this item.</p></div>
                {category ? <div className="grid gap-4 md:grid-cols-2">
                    {category.fields.map(field => {
                        const error = errors.specifications?.[field.key]?.message;
                        const name = `specifications.${field.key}` as const;
                        return <FormField key={field.key} label={field.label} helper={`Optional ${field.label.toLowerCase()} value.`} error={error}>
                            {field.options
                                ? <select className={formControlClass} aria-invalid={Boolean(error)} {...form.register(name)}><option value="">Select {field.label}</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select>
                                : <Input maxLength={200} className={formControlClass} aria-invalid={Boolean(error)} {...form.register(name)} />}
                        </FormField>;
                    })}
                </div> : <p className="text-sm text-muted-foreground">Choose an item family to see its specification fields.</p>}
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Unit & conversion (optional)</h2><p className="text-sm text-muted-foreground">Use when this item is bought in one unit and used in another.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Unit" required helper="This is the item’s base unit." error={errors.unit?.message}>
                        <select className={formControlClass} aria-invalid={Boolean(errors.unit)} value={unit} onChange={event => handleUnitChange(event.target.value as Unit)}>{UNIT_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}</select>
                    </FormField>
                    <div className="space-y-2">
                        <FormField label="Convert to" helper={unit === "Nos." ? "Not applicable for Nos." : "Optional. Choose a valid unit pair or leave as No conversion."} error={errors.conversionUnit?.message}>
                            {unit === "Nos." ? <div className={`${formControlClass} flex items-center text-muted-foreground`}>Not applicable</div> : <select className={formControlClass} aria-invalid={Boolean(errors.conversionUnit)} value={conversionUnit} onChange={event => handleConversionChange(event.target.value)}>
                                <option value="">No conversion</option>
                                {item?.conversionUnit && !conversionOptions.some(option => option.to === item.conversionUnit) && <option value={item.conversionUnit}>{item.conversionUnit} (stored pair)</option>}
                                {conversionOptions.map(option => <option key={option.to} value={option.to}>{option.to}</option>)}
                            </select>}
                        </FormField>
                    </div>
                    {unit !== "Nos." && conversionUnit && <FormField label="Conversion factor" required helper={selectedConversion?.factorMode === "manual" && (unit === "Kg" || unit === "RMtr" || unit === "Sq. Mtr.")
                        ? unit === "Kg" ? "Weight per metre differs by size; enter the value for this exact item." : "Enter the factor for this item; no parseable Width specification is available."
                        : selectedConversion?.factorMode === "width" ? "Calculated from width." : selectedConversion?.factorMode === "fixed" ? "Fixed by the unit conversion rule." : "Enter a positive factor with up to 6 decimals."} error={errors.conversionFactor?.message}>
                        <Input type="number" inputMode="decimal" min="0" step={selectedConversion?.factorMode === "manual" ? "0.000001" : "any"} className={formControlClass} aria-invalid={Boolean(errors.conversionFactor)} readOnly={selectedConversion?.factorMode !== "manual"} {...form.register("conversionFactor")} />
                    </FormField>}
                </div>
                {unit !== "Nos." && conversionUnit && conversionOptionsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading valid conversions…</p>}
                {unit !== "Nos." && conversionUnit && conversionOptionsQuery.error && <Alert variant="destructive"><AlertDescription>Unable to load conversion rules. Retry by changing the unit.</AlertDescription></Alert>}
                {unit !== "Nos." && conversionUnit && !conversionOptionsQuery.isLoading && !selectedConversion && <Alert variant="destructive"><AlertDescription>This saved conversion pair is invalid. Choose a valid target or No conversion.</AlertDescription></Alert>}
                {storedPairInvalid && <Alert variant="destructive"><AlertDescription>The stored conversion pair is invalid. Its saved values are shown until you choose a valid pair.</AlertDescription></Alert>}
                {storedWidthMismatch && <Alert><AlertDescription>The saved factor ({item?.conversionFactor}) differs from the factor derived from Width ({selectedConversion?.factor}). The stored value remains loaded; saving will recalculate it from Width.</AlertDescription></Alert>}
                {storedFixedMismatch && <Alert><AlertDescription>The saved factor ({item?.conversionFactor}) differs from the fixed rule ({selectedConversion?.factor}). The stored value remains loaded; saving will recalculate it.</AlertDescription></Alert>}
                {showPreview && conversionUnit && <p className="rounded-md bg-muted/50 p-3 text-sm" aria-live="polite">1 {unit} = {formatPreview(factorNumber)} {conversionUnit}, 1 {conversionUnit} = {formatPreview(1 / factorNumber)} {unit}</p>}
                {unitChangedNotice && <Alert><AlertDescription>Unit changed. The previous conversion and factor were cleared.</AlertDescription></Alert>}
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Description</h2><p className="text-sm text-muted-foreground">Add details that help identify or use this item.</p></div>
                <FormField label="Description" helper="Optional. Up to 500 characters." error={errors.description?.message}>
                    <textarea rows={4} maxLength={500} className="min-h-28 w-full resize-y rounded-md border border-slate-400 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-600" aria-invalid={Boolean(errors.description)} {...form.register("description")} />
                </FormField>
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Availability</h2><p className="text-sm text-muted-foreground">Inactive items stay visible in history and can be filtered out.</p></div>
                <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 rounded border-slate-400" {...form.register("isActive")} />Active item</label>
            </section>

            <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-lg backdrop-blur sm:-mx-6 sm:px-6">
                <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={leavePage}>Cancel</Button>
                <Button type="button" className="min-h-11 min-w-28" onClick={() => void form.handleSubmit(onValid, onInvalid)()} disabled={saving || submissionLock.current || (isEdit && itemLoading) || (isEdit && !item)}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEdit ? "Save changes" : "Save item"}
                </Button>
            </div>
        </form>
    </div>;
}

function FormField({ label, required, helper, error, children }: { label: string; required?: boolean; helper: string; error?: string; children: ReactNode }) {
    return <div className="min-w-0 space-y-1.5">
        <Label className="text-sm font-medium">{label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}</Label>
        {children}
        {error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
        <p className="text-xs text-muted-foreground">{helper}</p>
    </div>;
}
