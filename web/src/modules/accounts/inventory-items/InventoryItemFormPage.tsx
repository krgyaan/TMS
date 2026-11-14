import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";
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
import { ITEM_CATALOG, fieldIsVisible, findCatalogItem, getItemMainCategory } from "./item-catalog";
import { UNIT_OPTIONS, type Unit } from "./item-config";
import { generateTemplatedItemCode, getItemCodePreview } from "./item-code-generator";
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
        defaultValues: { category: "", subcategory: "", itemName: "", itemType: "", specifications: {}, makeBrand: "", modelNumber: "", description: "", unit: "Nos.", conversionEnabled: false, conversionUnit: "", conversionFactor: "", hsnCode: "", isActive: true },
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
    const categoryName = useWatch({ control: form.control, name: "category" });
    const itemName = useWatch({ control: form.control, name: "itemName" });
    const specifications = useWatch({ control: form.control, name: "specifications" }) || {};
    const conversionEnabled = useWatch({ control: form.control, name: "conversionEnabled" });
    const conversionUnit = useWatch({ control: form.control, name: "conversionUnit" });
    const conversionFactor = useWatch({ control: form.control, name: "conversionFactor" });
    const width = useWatch({ control: form.control, name: "specifications.width" }) || "";
    const isDirty = form.formState.isDirty;
    const category = ITEM_CATALOG.find(candidate => candidate.name === categoryName);
    const catalogItem = findCatalogItem(categoryName, itemName);
    const codeFieldKeys = catalogItem?.codeTemplate ? [...catalogItem.codeTemplate.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(match => match[1]) : [];
    const isCatalogCodeEdit = Boolean(isEdit && item && catalogItem?.codeTemplate && generateTemplatedItemCode(categoryName, itemName, item.specifications || {}) === item.itemCode);
    const itemCodePreview = isEdit && item ? item.itemCode : getItemCodePreview(categoryName, itemName, specifications);
    const conversionOptionsQuery = useItemConversionOptions(unit, width, conversionEnabled);
    const conversionOptions = conversionOptionsQuery.data || [];
    const selectedConversion = conversionOptions.find(option => option.to === conversionUnit);
    const saving = createItem.isPending || updateItem.isPending;
    const conversionApplicable = !["Nos.", "Litre", "Pair", "Set"].includes(unit);

    useEffect(() => {
        if (isEdit) {
            if (!item || initializedForm.current === `edit-${itemId}`) return;
            form.reset({
                category: getItemMainCategory(item.itemName, item.category), subcategory: "", itemName: item.itemName, itemType: item.itemType || "",
                specifications: item.specifications || {}, makeBrand: item.makeBrand || "", modelNumber: item.modelNumber || "", description: item.description || "",
                unit: item.unit as Unit, conversionEnabled: Boolean(item.conversionUnit), conversionUnit: item.conversionUnit || "",
                conversionFactor: item.conversionFactor || "", hsnCode: item.hsnCode || "", isActive: item.isActive,
            });
            lastWidth.current = item.specifications?.width || "";
            initializedForm.current = `edit-${itemId}`;
            formUrl.current = window.location.href;
            setUnitChangedNotice(false);
        } else if (initializedForm.current !== "new") {
            form.reset({
                category: "", subcategory: "", itemName: "", itemType: "", specifications: {}, makeBrand: "", modelNumber: "", description: "", unit: "Nos.", conversionEnabled: false,
                conversionUnit: "", conversionFactor: "", hsnCode: "", isActive: true,
            });
            lastWidth.current = "";
            initializedForm.current = "new";
            formUrl.current = window.location.href;
            setUnitChangedNotice(false);
        }
    }, [isEdit, itemId, item, form]);

    useEffect(() => {
        if (!catalogItem) return;
        for (const field of catalogItem.fields) {
            if (!fieldIsVisible(specifications, field) && specifications[field.key]) {
                form.setValue(`specifications.${field.key}`, "", { shouldValidate: true });
            }
        }
    }, [catalogItem, specifications, form]);

    useEffect(() => {
        if (!conversionEnabled || width !== (form.getValues("specifications.width") || "") || width === lastWidth.current) return;
        if (conversionUnit && conversionOptionsQuery.isLoading) return;
        if (selectedConversion?.factorMode === "width" && selectedConversion.factor !== null) {
            form.setValue("conversionFactor", String(selectedConversion.factor), { shouldDirty: true, shouldValidate: true });
        }
        lastWidth.current = width;
    }, [width, conversionUnit, conversionEnabled, selectedConversion, conversionOptionsQuery.isLoading, form]);

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
            if (nextUnit === "Nos.") form.setValue("conversionEnabled", false, { shouldDirty: true });
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
            const selectedOption = values.conversionEnabled ? conversionOptions.find(option => option.to === values.conversionUnit) : undefined;
            if (values.conversionEnabled && values.conversionUnit && !selectedOption) {
                form.setError("conversionUnit", { type: "validate", message: "This stored conversion is not an allowed pair. Choose another target or No conversion." });
                return;
            }
            if (values.conversionEnabled && selectedOption?.factorMode === "manual" && (!/^(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(normalizeFactorText(values.conversionFactor)) || Number(values.conversionFactor) <= 0)) {
                form.setError("conversionFactor", { type: "validate", message: "Enter a positive factor with up to 6 decimals." });
                return;
            }
            const typeField = catalogItem?.fields.find(field => field.listColumn === "type");
            const payload: InventoryItemPayload = {
                category: values.category, subcategory: values.subcategory || null, modelNumber: values.modelNumber?.trim() || null, itemName: values.itemName,
                itemType: typeField ? values.specifications[typeField.key] || null : values.itemType.trim() || null,
                makeBrand: values.makeBrand.trim() || null,
                specifications: values.specifications, description: values.description.trim() || null,
                unit: values.unit, conversionUnit: values.conversionEnabled ? values.conversionUnit || null : null,
                conversionFactor: values.conversionEnabled && values.conversionUnit ? values.conversionFactor : null,
                hsnCode: values.hsnCode.trim(), isActive: values.isActive,
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
    const showPreview = conversionEnabled && conversionUnit && Number.isFinite(factorNumber) && factorNumber > 0;

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
                <div><h2 className="font-semibold">Item details</h2><p className="text-sm text-muted-foreground">Choose a category, then an item name from that category.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Category" required helper={isCatalogCodeEdit ? "These options form the item code and cannot be changed. Create a new item instead." : "Select the item category."} error={errors.category?.message}>
                        {isCatalogCodeEdit ? <div className={`${formControlClass} flex items-center`} aria-readonly="true">{categoryName}</div> : <select className={formControlClass} aria-invalid={Boolean(errors.category)} {...form.register("category", { onChange: event => {
                            form.setValue("itemName", "", { shouldDirty: true, shouldValidate: true });
                            form.setValue("itemType", "", { shouldDirty: true });
                            form.setValue("specifications", {}, { shouldDirty: true });
                        } })}>
                            <option value="">Select category</option>
                            {ITEM_CATALOG.map(option => <option key={option.name} value={option.name}>{option.name}</option>)}
                        </select>}
                    </FormField>
                    <FormField label="Item Name" required helper={isCatalogCodeEdit ? "These options form the item code and cannot be changed. Create a new item instead." : "Select an item in this category."} error={errors.itemName?.message}>
                        {isCatalogCodeEdit ? <div className={`${formControlClass} flex items-center`} aria-readonly="true">{itemName}</div> : <select className={formControlClass} aria-invalid={Boolean(errors.itemName)} disabled={!category} {...form.register("itemName", { onChange: event => {
                            form.setValue("itemType", "", { shouldDirty: true });
                            form.setValue("specifications", {}, { shouldDirty: true });
                            const selected = category?.items.find(candidate => candidate.name === event.target.value);
                            if (selected?.defaultUnit) form.setValue("unit", selected.defaultUnit as Unit, { shouldDirty: true });
                        } })}>
                            <option value="">Select item name</option>
                            {category && <optgroup label={category.name}>{category.items.map(option => <option key={option.name} value={option.name} disabled={option.pending}>{option.pending ? `${option.name} (pending finalization)` : option.name}</option>)}</optgroup>}
                        </select>}
                    </FormField>
                    {catalogItem?.legacyTypes && <FormField label="Type" helper="Select the legacy item type." error={errors.itemType?.message}>
                        <select className={formControlClass} aria-invalid={Boolean(errors.itemType)} {...form.register("itemType")}><option value="">Select type</option>{catalogItem.legacyTypes.map(type => <option key={type} value={type}>{type}</option>)}</select>
                    </FormField>}
                </div>
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Item Code (auto-generated)</h2><p className="text-sm text-muted-foreground">The server assigns the saved item code.</p></div>
                <output className="block min-h-11 break-all rounded-md border bg-muted/40 px-3 py-3 text-sm font-medium" aria-live="polite">{itemCodePreview}</output>
                {isCatalogCodeEdit && <p className="text-sm text-muted-foreground">These options form the item code and cannot be changed. Create a new item instead.</p>}
            </section>

            <section className={sectionClass}>
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="HSN Code" required helper="Enter 4 to 8 digits." error={errors.hsnCode?.message}>
                        <Input inputMode="numeric" maxLength={8} className={formControlClass} aria-invalid={Boolean(errors.hsnCode)} {...form.register("hsnCode")} />
                    </FormField>
                </div>
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Specifications</h2><p className="text-sm text-muted-foreground">Add the measurable or descriptive properties for this item.</p></div>
                {catalogItem ? <div className="grid gap-4 md:grid-cols-2">
                    {catalogItem.fields.filter(field => fieldIsVisible(specifications, field)).map(field => {
                        const error = errors.specifications?.[field.key]?.message;
                        const name = `specifications.${field.key}` as const;
                        const isCodeField = isCatalogCodeEdit && codeFieldKeys.includes(field.key);
                        const selectedOption = field.options?.find(option => option.value === specifications[field.key]);
                        const helper = selectedOption?.helper || (field.required ? `${field.label} is required.` : `Optional ${field.label.toLowerCase()} value.`);
                        return <FormField key={field.key} label={field.listColumn === "type" ? "Type" : field.label} required={field.required} helper={isCodeField ? "These options form the item code and cannot be changed. Create a new item instead." : helper} error={error}>
                            {field.options
                                ? isCodeField ? <div className={`${formControlClass} flex items-center`} aria-readonly="true">{specifications[field.key]}</div> : <select className={formControlClass} aria-invalid={Boolean(error)} {...form.register(name)}><option value="">Select {field.label}</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.value}</option>)}</select>
                                : isCodeField ? <div className={`${formControlClass} flex items-center`} aria-readonly="true">{specifications[field.key]}{field.suffix ? ` ${field.suffix}` : ""}</div> : <div className="relative"><Input type={field.kind === "number" ? "number" : "text"} min={field.min} max={field.max} step={field.integer ? "1" : field.kind === "number" ? "any" : undefined} maxLength={field.kind === "text" ? 200 : undefined} className={`${formControlClass} ${field.suffix ? "pr-16" : ""}`} aria-invalid={Boolean(error)} {...form.register(name)} />{field.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{field.suffix}</span>}</div>}
                        </FormField>;
                    })}
                </div> : <p className="text-sm text-muted-foreground">Choose an item name to see its specification fields.</p>}
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Unit</h2><p className="text-sm text-muted-foreground">Choose the item’s base unit.</p></div>
                <FormField label="Unit" required helper="This is the item’s base unit." error={errors.unit?.message}>
                    <select className={formControlClass} aria-invalid={Boolean(errors.unit)} value={unit} onChange={event => handleUnitChange(event.target.value as Unit)}>{UNIT_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}</select>
                </FormField>
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Unit conversion (optional)</h2><p className="text-sm text-muted-foreground">Enable only when this item needs a second unit.</p></div>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input type="checkbox" className="h-5 w-5" disabled={!conversionApplicable && !conversionEnabled} {...form.register("conversionEnabled", { onChange: event => {
                        if (!event.target.checked) {
                            form.setValue("conversionUnit", "", { shouldDirty: true });
                            form.setValue("conversionFactor", "", { shouldDirty: true });
                            form.clearErrors(["conversionUnit", "conversionFactor"]);
                        }
                    } })} />
                    Add unit conversion
                    {!conversionApplicable && <span className="text-xs text-muted-foreground">Not applicable for {unit}.</span>}
                </label>
                {conversionEnabled && <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <FormField label="Convert to" required helper="Choose a valid unit pair." error={errors.conversionUnit?.message}>
                            <select className={formControlClass} aria-invalid={Boolean(errors.conversionUnit)} value={conversionUnit} onChange={event => handleConversionChange(event.target.value)}>
                                <option value="">Select unit</option>
                                {item?.conversionUnit && !conversionOptions.some(option => option.to === item.conversionUnit) && <option value={item.conversionUnit}>{item.conversionUnit} (stored pair)</option>}
                                {conversionOptions.map(option => <option key={option.to} value={option.to}>{option.to}</option>)}
                            </select>
                        </FormField>
                    </div>
                    {conversionUnit && <FormField label="Factor" required helper={selectedConversion?.factorMode === "manual" && (unit === "Kg" || unit === "RMtr" || unit === "Sq. Mtr.")
                        ? unit === "Kg" ? "Weight per metre differs by size; enter the value for this exact item." : "Enter the factor for this item; no parseable Width specification is available."
                        : selectedConversion?.factorMode === "width" ? "Calculated from width." : selectedConversion?.factorMode === "fixed" ? "Fixed by the unit conversion rule." : "Enter a positive factor with up to 6 decimals."} error={errors.conversionFactor?.message}>
                        <Input type="number" inputMode="decimal" min="0" step={selectedConversion?.factorMode === "manual" ? "0.000001" : "any"} className={formControlClass} aria-invalid={Boolean(errors.conversionFactor)} readOnly={selectedConversion?.factorMode !== "manual"} {...form.register("conversionFactor")} />
                    </FormField>}
                </div>}
                {conversionEnabled && conversionUnit && conversionOptionsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading valid conversions…</p>}
                {conversionEnabled && conversionUnit && conversionOptionsQuery.error && <Alert variant="destructive"><AlertDescription>Unable to load conversion rules. Retry by changing the unit.</AlertDescription></Alert>}
                {conversionEnabled && conversionUnit && !conversionOptionsQuery.isLoading && !selectedConversion && <Alert variant="destructive"><AlertDescription>This saved conversion pair is invalid. Choose a valid target.</AlertDescription></Alert>}
                {conversionEnabled && storedPairInvalid && <Alert variant="destructive"><AlertDescription>The stored conversion pair is invalid. Its saved values are shown until you choose a valid pair.</AlertDescription></Alert>}
                {conversionEnabled && storedWidthMismatch && <Alert><AlertDescription>The saved factor ({item?.conversionFactor}) differs from the factor derived from Width ({selectedConversion?.factor}). The stored value remains loaded; saving will recalculate it from Width.</AlertDescription></Alert>}
                {conversionEnabled && storedFixedMismatch && <Alert><AlertDescription>The saved factor ({item?.conversionFactor}) differs from the fixed rule ({selectedConversion?.factor}). The stored value remains loaded; saving will recalculate it.</AlertDescription></Alert>}
                {showPreview && conversionUnit && <p className="rounded-md bg-muted/50 p-3 text-sm" aria-live="polite">1 {unit} = {formatPreview(factorNumber)} {conversionUnit}, 1 {conversionUnit} = {formatPreview(1 / factorNumber)} {unit}</p>}
                {unitChangedNotice && <Alert><AlertDescription>Unit changed. The previous conversion and factor were cleared.</AlertDescription></Alert>}
            </section>

            <section className={sectionClass}>
                <div><h2 className="font-semibold">Make/Brand</h2><p className="text-sm text-muted-foreground">Optional manufacturer or brand.</p></div>
                <FormField label="Make/Brand" helper="Optional. Up to 120 characters." error={errors.makeBrand?.message}>
                    <Input maxLength={120} className={formControlClass} aria-invalid={Boolean(errors.makeBrand)} {...form.register("makeBrand")} />
                </FormField>
                <FormField label="Model Number" helper="Optional. Up to 120 characters." error={errors.modelNumber?.message}>
                    <Input maxLength={120} className={formControlClass} aria-invalid={Boolean(errors.modelNumber)} {...form.register("modelNumber")} />
                </FormField>
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
    const id = useId();
    const control = isValidElement(children) ? cloneElement(children, { id, "aria-describedby": error ? `${id}-error` : undefined } as Record<string, unknown>) : children;
    return <div className="min-w-0 space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium">{label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}</Label>
        {control}
        {error ? <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
        <p className="text-xs text-muted-foreground">{helper}</p>
    </div>;
}
