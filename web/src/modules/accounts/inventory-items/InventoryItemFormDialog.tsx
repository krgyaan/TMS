import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateInventoryItem, useUpdateInventoryItem, type ItemMasterTeam } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { UNIT_OPTIONS, categoryOptions, getCategory, getConversionRules } from "./item-config";

const schema = z.object({
    teamId: z.enum(["3", "5"]),
    itemName: z.string().min(1, "Item name is required"),
    itemType: z.string().optional(),
    specifications: z.record(z.string()),
    description: z.string().optional(),
    unit: z.enum(UNIT_OPTIONS, { message: "Unit is required" }),
    conversionUnit: z.string().optional(),
    conversionFactor: z.string().optional(),
    hsnCode: z.string().optional(),
    isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;
type Props = { open: boolean; onOpenChange: (open: boolean) => void; item?: InventoryItem | null; routeTeam: ItemMasterTeam };

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function InventoryItemFormDialog({ open, onOpenChange, item, routeTeam }: Props) {
    const { canCreate } = useAuth();
    const canCreateBoth = canCreate("accounts.item-master") && canCreate("operations.item-master");
    const createItem = useCreateInventoryItem(routeTeam);
    const updateItem = useUpdateInventoryItem(routeTeam);
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { teamId: routeTeam === "accounts" ? "5" : "3", itemName: "", itemType: "", specifications: {}, description: "", unit: "Nos.", conversionUnit: "", conversionFactor: "", hsnCode: "", isActive: true },
    });
    const itemName = form.watch("itemName");
    const unit = form.watch("unit");
    const conversionUnit = form.watch("conversionUnit");
    const category = getCategory(itemName);
    const conversionRules = useMemo(() => getConversionRules(unit), [unit]);
    const selectedRule = conversionRules.find(rule => rule.to === conversionUnit);
    const saving = createItem.isPending || updateItem.isPending;
    const mutationError = createItem.error || updateItem.error;

    useEffect(() => {
        if (!open) return;
        form.reset(item ? {
            teamId: String(item.teamId) as "3" | "5",
            itemName: item.itemName,
            itemType: item.itemType || "",
            specifications: item.specifications || {},
            description: item.description || "",
            unit: item.unit as FormValues["unit"],
            conversionUnit: item.conversionUnit || "",
            conversionFactor: item.conversionFactor || "",
            hsnCode: item.hsnCode || "",
            isActive: item.isActive,
        } : { teamId: routeTeam === "accounts" ? "5" : "3", itemName: "", itemType: "", specifications: {}, description: "", unit: "Nos.", conversionUnit: "", conversionFactor: "", hsnCode: "", isActive: true });
        createItem.reset();
        updateItem.reset();
    }, [open, item, routeTeam]);

    useEffect(() => {
        if (unit === "Nos.") {
            form.setValue("conversionUnit", "");
            form.setValue("conversionFactor", "");
        } else if (conversionUnit && !conversionRules.some(rule => rule.to === conversionUnit)) {
            form.setValue("conversionUnit", "");
            form.setValue("conversionFactor", "");
        }
    }, [unit, conversionUnit, conversionRules, form]);

    useEffect(() => {
        if (selectedRule?.factor !== null && selectedRule?.factor !== undefined) {
            form.setValue("conversionFactor", String(selectedRule.factor));
        }
    }, [selectedRule, form]);

    const submit = async (values: FormValues) => {
        const payload = {
            teamId: Number(values.teamId),
            itemName: values.itemName,
            itemType: values.itemType || null,
            specifications: values.specifications,
            description: values.description?.trim() || null,
            unit: values.unit,
            conversionUnit: values.unit === "Nos." ? null : values.conversionUnit || null,
            conversionFactor: values.unit === "Nos." ? null : values.conversionFactor || null,
            hsnCode: values.hsnCode?.trim() || null,
            isActive: values.isActive,
        };
        if (item) await updateItem.mutateAsync({ id: item.id, data: payload });
        else await createItem.mutateAsync(payload);
        onOpenChange(false);
    };

    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader><DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle><DialogDescription>Manage team-scoped item specifications, units, conversions and HSN codes.</DialogDescription></DialogHeader>
            <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {mutationError && <Alert variant="destructive" className="md:col-span-2"><AlertDescription>{mutationError instanceof Error ? mutationError.message : "Unable to save item."}</AlertDescription></Alert>}
                <div className="space-y-2"><Label>Team</Label><select className={inputClass} disabled={!canCreateBoth} {...form.register("teamId")}><option value="5">Accounts</option><option value="3">Operations</option></select></div>
                <div className="space-y-2"><Label>Item Name</Label><select className={inputClass} {...form.register("itemName")}><option value="">Select item family</option>{categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{form.formState.errors.itemName && <p className="text-sm text-destructive">{form.formState.errors.itemName.message}</p>}</div>
                {category?.types && <div className="space-y-2"><Label>Item Type</Label><select className={inputClass} {...form.register("itemType")}><option value="">Select item type</option>{category.types.map(value => <option key={value} value={value}>{value}</option>)}</select></div>}
                {category?.fields.map(field => <div key={field.key} className="space-y-2"><Label>{field.label}</Label>{field.options ? <select className={inputClass} {...form.register(`specifications.${field.key}` as const)}><option value="">Select {field.label}</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : <Input {...form.register(`specifications.${field.key}` as const)} placeholder={field.label} />}</div>)}
                <div className="space-y-2 md:col-span-2"><Label>Description <span className="text-muted-foreground">(optional)</span></Label><textarea className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...form.register("description")} placeholder="Optional item description" /></div>
                <div className="space-y-2"><Label>Unit</Label><select className={inputClass} {...form.register("unit")}><option value="">Select unit</option>{UNIT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                <div className="space-y-2"><Label>Conversion</Label>{unit === "Nos." ? <Input value="NA" readOnly /> : <select className={inputClass} {...form.register("conversionUnit")}><option value="">Select conversion</option>{conversionRules.map(rule => <option key={rule.to} value={rule.to}>{rule.from} -&gt; {rule.to}</option>)}</select>}</div>
                {unit !== "Nos." && conversionUnit && <div className="space-y-2"><Label>Factor</Label><Input type="number" step="any" min="0.000001" readOnly={selectedRule?.factor !== null} placeholder={`1 ${unit} = ___ ${conversionUnit}`} {...form.register("conversionFactor")} />{selectedRule?.factor === null && <p className="text-xs text-muted-foreground">Required and must be greater than zero.</p>}</div>}
                <div className="space-y-2"><Label>HSN Code</Label><Input {...form.register("hsnCode")} placeholder="HSN code" /></div>
                <p className="text-xs text-muted-foreground md:col-span-2">Stock quantity and price are maintained in Inventory/Purchase, not Item Master.</p>
                <label className="flex items-center gap-2"><input type="checkbox" {...form.register("isActive")} /><span className="text-sm">Active</span></label>
                <DialogFooter className="md:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : item ? "Save Changes" : "Create Item"}</Button></DialogFooter>
            </form></Form>
        </DialogContent>
    </Dialog>;
}
