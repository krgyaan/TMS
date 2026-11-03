import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectField } from "@/components/form/SelectField";
import { Form } from "@/components/ui/form";
import { useCreateInventoryItem, useUpdateInventoryItem } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { getCategory, getFamiliesForGroup, groupOptions } from "./item-config";

const schema = z.object({
    itemGroup: z.enum(["Raw Materials", "Finished Goods", "Supplies"]),
    itemName: z.string().min(1, "Item name is required"),
    itemType: z.string().optional(),
    specifications: z.record(z.string()),
    description: z.string().optional(),
    unit: z.string().min(1, "Unit is required"),
    conversion: z.string().min(1, "Conversion is required"),
    hsnCode: z.string().optional(),
    isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

type Props = { open: boolean; onOpenChange: (open: boolean) => void; item?: InventoryItem | null };

export function InventoryItemFormDialog({ open, onOpenChange, item }: Props) {
    const createItem = useCreateInventoryItem();
    const updateItem = useUpdateInventoryItem();
    const resetCreate = createItem.reset;
    const resetUpdate = updateItem.reset;
    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: { itemGroup: "Raw Materials", itemName: "", itemType: "", specifications: {}, description: "", unit: "", conversion: "", hsnCode: "", isActive: true },
    });
    const itemName = form.watch("itemName");
    const itemGroup = form.watch("itemGroup");
    const selectedType = form.watch("itemType");
    const category = getCategory(itemName);
    const saving = createItem.isPending || updateItem.isPending;
    const mutationError = createItem.error || updateItem.error;
    const previousCategory = useRef(itemName);
    const previousGroup = useRef(itemGroup);
    const unitOptions = useMemo(() => itemName === "Copper" && selectedType ? [selectedType === "Pipe" ? "Kgs." : "Nos."] : category?.unitOptions, [category?.unitOptions, itemName, selectedType]);
    const conversionOptions = useMemo(() => itemName === "Copper" && selectedType ? [selectedType === "Pipe" ? "Kg to Mtr." : "NA"] : category?.conversionOptions, [category?.conversionOptions, itemName, selectedType]);

    useEffect(() => {
        if (!open) return;
        previousCategory.current = item?.itemName || "";
        previousGroup.current = item?.itemGroup || "Raw Materials";
        form.reset(item ? {
            itemGroup: item.itemGroup,
            itemName: item.itemName,
            itemType: item.itemType || "",
            specifications: item.specifications || {},
            description: item.description || "",
            unit: item.unit,
            conversion: item.conversion?.value || Object.values(item.conversion || {})[0] || "",
            hsnCode: item.hsnCode || "",
            isActive: item.isActive,
        } : { itemGroup: "Raw Materials", itemName: "", itemType: "", specifications: {}, description: "", unit: "", conversion: "", hsnCode: "", isActive: true });
        resetCreate();
        resetUpdate();
    }, [open, item, form, resetCreate, resetUpdate]);

    useEffect(() => {
        if (previousGroup.current !== itemGroup) {
            form.setValue("itemName", "");
            form.setValue("itemType", "");
            form.setValue("specifications", {});
            form.setValue("unit", "");
            form.setValue("conversion", "");
        }
        previousGroup.current = itemGroup;
    }, [itemGroup, form]);

    useEffect(() => {
        if (previousCategory.current && previousCategory.current !== itemName) {
            form.setValue("itemType", "");
            form.setValue("specifications", {});
            form.setValue("unit", "");
            form.setValue("conversion", "");
        }
        previousCategory.current = itemName;
    }, [itemName, form]);

    useEffect(() => {
        if (itemName !== "Copper" || !selectedType) return;
        form.setValue("unit", unitOptions?.[0] || "");
        form.setValue("conversion", conversionOptions?.[0] || "");
    }, [itemName, selectedType, form, unitOptions, conversionOptions]);

    const submit = async (values: FormValues) => {
        const payload = {
            itemGroup: values.itemGroup,
            itemName: values.itemName,
            itemType: values.itemType || null,
            specifications: values.specifications,
            description: values.description?.trim() || null,
            unit: values.unit,
            conversion: { value: values.conversion },
            hsnCode: values.hsnCode?.trim() || null,
            isActive: values.isActive,
        };
        if (item) await updateItem.mutateAsync({ id: item.id, data: payload });
        else await createItem.mutateAsync(payload);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
                    <DialogDescription>Manage inventory specifications, units, conversions and HSN codes.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
                        {mutationError && <Alert variant="destructive"><AlertDescription>{mutationError instanceof Error ? mutationError.message : "Unable to save item. Check for duplicate item details."}</AlertDescription></Alert>}
                        <SelectField control={form.control} name="itemGroup" label="Item Group" options={groupOptions} placeholder="Select item group" valueType="string" />
                        <SelectField control={form.control} name="itemName" label="Item Name" options={getFamiliesForGroup(itemGroup)} placeholder="Select item family" valueType="string" />
                        {category?.types && <SelectField control={form.control} name="itemType" label="Item Type" options={category.types.map(value => ({ id: value, name: value }))} placeholder="Select item type" valueType="string" />}
                        {category?.fields.map(field => (
                            <div key={field.key} className="space-y-2">
                                <Label>{field.label}</Label>
                                {field.options ? (
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register(`specifications.${field.key}` as any)}>
                                        <option value="">Select {field.label}</option>
                                        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                ) : <Input {...form.register(`specifications.${field.key}` as any)} placeholder={field.label} />}
                            </div>
                        ))}
                        <div className="space-y-2"><Label>Description <span className="text-muted-foreground">(optional)</span></Label><textarea className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...form.register("description")} placeholder="Optional item description" /></div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                {unitOptions ? (
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register("unit")}>
                                        <option value="">Select unit</option>
                                        {unitOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                ) : <Input {...form.register("unit")} placeholder="Configure unit" />}
                            </div>
                            <div className="space-y-2">
                                <Label>Conversion</Label>
                                {conversionOptions ? (
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register("conversion")}>
                                        <option value="">Select conversion</option>
                                        {conversionOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                ) : <Input {...form.register("conversion")} placeholder="Configure conversion" />}
                            </div>
                        </div>
                        <div className="space-y-2"><Label>HSN Code</Label><Input {...form.register("hsnCode")} placeholder="HSN code" /></div>
                        <p className="text-xs text-muted-foreground">Stock quantity and price are maintained in Inventory/Purchase, not Item Master.</p>
                        <div className="flex items-center gap-2"><input type="checkbox" {...form.register("isActive")} /><Label>Active</Label></div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving}>{saving ? "Saving..." : item ? "Save Changes" : "Create Item"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
