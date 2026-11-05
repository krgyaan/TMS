import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { SelectField } from "@/components/form/SelectField";
import { toast } from "sonner";
import { useTeams } from "@/hooks/api/useTeams";
import { handleQueryError } from "@/lib/react-query";
import { useCreateInventoryItem, useUpdateInventoryItem, type ItemMasterTeam } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { UNIT_OPTIONS, categoryOptions, getCategory } from "./item-config";
import { inventoryItemFormSchema, type InventoryItemFormValues } from "./item-form-schema";

type FormValues = InventoryItemFormValues;
type Props = { open: boolean; onOpenChange: (open: boolean) => void; item?: InventoryItem | null; routeTeam: ItemMasterTeam };
const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function InventoryItemFormDialog({ open, onOpenChange, item, routeTeam }: Props) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [descriptionOpen, setDescriptionOpen] = useState(false);
    const { data: allTeams = [] } = useTeams({ enabled: open });
    const teamOptions = useMemo(() => allTeams
        .filter(team => team.name === "AC" || team.name === "DC")
        .map(team => ({ id: String(team.id), name: team.name })), [allTeams]);
    const createItem = useCreateInventoryItem(routeTeam);
    const updateItem = useUpdateInventoryItem(routeTeam);
    const form = useForm<FormValues>({
        resolver: zodResolver(inventoryItemFormSchema),
        defaultValues: { teamId: "", itemName: "", itemType: "", specifications: {}, description: "", unit: "Nos.", hsnCode: "", isActive: true },
    });
    const itemName = form.watch("itemName");
    const category = getCategory(itemName);
    const saving = createItem.isPending || updateItem.isPending;
    const mutationError = createItem.error || updateItem.error;

    useEffect(() => {
        if (!open) return;
        setSubmitError(null);
        setDescriptionOpen(Boolean(item?.description));
        form.reset(item ? {
            teamId: String(item.teamId), itemName: item.itemName, itemType: item.itemType || "",
            specifications: item.specifications || {}, description: item.description || "",
            unit: item.unit as FormValues["unit"], hsnCode: item.hsnCode || "", isActive: item.isActive,
        } : {
            teamId: teamOptions.find(team => team.name === "AC")?.id || "", itemName: "", itemType: "",
            specifications: {}, description: "", unit: "Nos.", hsnCode: "", isActive: true,
        });
        createItem.reset();
        updateItem.reset();
        const focusTimer = window.setTimeout(() => form.setFocus("teamId"), 0);
        return () => window.clearTimeout(focusTimer);
    }, [open, item, routeTeam]);

    useEffect(() => {
        if (open && !item && !form.getValues("teamId")) {
            form.setValue("teamId", teamOptions.find(team => team.name === "AC")?.id || "");
        }
    }, [open, item, teamOptions, form]);

    const submit = async (values: FormValues) => {
        setSubmitError(null);
        const payload = {
            teamId: Number(values.teamId), itemName: values.itemName, itemType: values.itemType || null,
            specifications: values.specifications, description: values.description?.trim() || null,
            unit: values.unit,
            hsnCode: values.hsnCode?.trim() || null, isActive: values.isActive,
        };
        if (item) await updateItem.mutateAsync({ id: item.id, data: payload });
        else await createItem.mutateAsync(payload);
        onOpenChange(false);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitError(null);
        void form.handleSubmit(submit)(event).catch(error => {
            const message = handleQueryError(error);
            setSubmitError(message);
            toast.error(message);
        });
    };

    const requestClose = (nextOpen: boolean) => {
        if (!nextOpen && form.formState.isDirty && !saving && !window.confirm("Discard unsaved item changes?")) return;
        onOpenChange(nextOpen);
    };
    const fieldError = (name: keyof FormValues) => form.formState.errors[name]?.message as string | undefined;

    return <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-hidden p-0 sm:max-w-3xl [&>div:first-child]:max-h-[calc(100dvh-4rem)] [&>div:first-child]:overflow-y-auto [&>div:first-child]:px-0">
            <Form {...form}><form onSubmit={handleSubmit} className="grid grid-cols-1 gap-0 md:grid-cols-2">
                <DialogHeader className="sticky top-0 z-10 col-span-full border-b bg-background px-5 py-3 text-left sm:px-6">
                    <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
                    <DialogDescription>Item details and specifications.</DialogDescription>
                </DialogHeader>
                <div className="col-span-full space-y-3 px-5 py-4 sm:px-6">
                    {(submitError || mutationError) && <Alert variant="destructive"><AlertDescription>{submitError || (mutationError instanceof Error ? handleQueryError(mutationError) : "Unable to save item.")}</AlertDescription></Alert>}
                    <section className="space-y-2">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                            <SelectField control={form.control} name="teamId" label="Team" placeholder="Select team" options={teamOptions} valueType="string" />
                            <SelectField control={form.control} name="itemName" label="Item Name" placeholder="Select item family" options={categoryOptions.map(option => ({ id: option.id, name: option.name }))} valueType="string" />
                            {category?.types && <div className="space-y-1"><Label className="text-xs">Type</Label><select className={inputClass} {...form.register("itemType")}><option value="">Select type</option>{category.types.map(type => <option key={type} value={type}>{type}</option>)}</select>{fieldError("itemType") && <p className="text-xs text-destructive">{fieldError("itemType")}</p>}</div>}
                            <div className="space-y-1"><Label className="text-xs">HSN</Label><Input className="h-9" {...form.register("hsnCode")} placeholder="HSN code" />{fieldError("hsnCode") && <p className="text-xs text-destructive">{fieldError("hsnCode")}</p>}</div>
                        </div>
                    </section>

                    {category && <section className="space-y-2">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                            {category.fields.map(field => <div key={field.key} className="space-y-1"><Label className="text-xs">{field.label}</Label>{field.options
                                ? <select className={inputClass} {...form.register(`specifications.${field.key}` as const)}><option value="">Select {field.label}</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select>
                                : <Input className="h-9" {...form.register(`specifications.${field.key}` as const)} placeholder={field.label} />}</div>)}
                        </div>
                    </section>}

                    <section className="space-y-2">
                        <div className="grid grid-cols-1 items-end gap-x-4 gap-y-3 md:grid-cols-2">
                            <div className="space-y-1"><Label className="text-xs">Unit</Label><select className={inputClass} {...form.register("unit")}>{UNIT_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}</select>{fieldError("unit") && <p className="text-xs text-destructive">{fieldError("unit")}</p>}</div>
                            <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" {...form.register("isActive")} />Active</label>
                        </div>
                    </section>
                    <section className="space-y-2">
                        {descriptionOpen ? <div className="space-y-1"><Label className="text-xs">Description</Label><textarea rows={2} className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm" {...form.register("description")} placeholder="Optional item description" /></div>
                            : <button type="button" onClick={() => setDescriptionOpen(true)} className="inline-flex items-center gap-1 text-xs text-primary"><Plus className="h-3 w-3" />Add description</button>}
                    </section>
                </div>
                <DialogFooter className="sticky bottom-0 z-10 col-span-full flex-row items-center justify-between border-t bg-background px-5 py-3 sm:px-6">
                    <p className="hidden text-xs text-muted-foreground sm:block">Stock and price are managed in Inventory/Purchase.</p>
                    <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => requestClose(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || teamOptions.length === 0}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{item ? "Save Changes" : "Create Item"}</Button></div>
                </DialogFooter>
            </form></Form>
        </DialogContent>
    </Dialog>;
}
