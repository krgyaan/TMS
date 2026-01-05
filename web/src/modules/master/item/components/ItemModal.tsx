// components/ItemModal.tsx
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SelectField } from "@/components/form/SelectField";
import type { SelectOption } from "@/components/form/SelectField";
import { useTeams } from "@/hooks/api/useTeams";
import { useItemHeadings } from "@/hooks/api/useItemHeadings";
import { useCreateItem, useUpdateItem } from "@/hooks/api/useItems";
import type { Item } from "@/types/api.types";
import { AlertCircle, HelpCircle, Loader2, Pencil, Plus, Package, Users, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const ItemFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    teamId: z.string().optional(),
    headingId: z.string().optional(),
    status: z.boolean().default(true),
});

type ItemFormValues = z.infer<typeof ItemFormSchema>;

type ItemModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item?: Item | null;
    onSuccess?: () => void;
};

export const ItemModal = ({ open, onOpenChange, item, onSuccess }: ItemModalProps) => {
    const { data: teams = [] } = useTeams();
    const { data: headings = [] } = useItemHeadings();
    const createItem = useCreateItem();
    const updateItem = useUpdateItem();
    const isEdit = !!item;

    const teamOptions = useMemo<SelectOption[]>(() => [{ id: "", name: "No team assigned" }, ...teams.map(team => ({ id: String(team.id), name: team.name }))], [teams]);

    const headingOptions = useMemo<SelectOption[]>(
        () => [{ id: "", name: "No heading assigned" }, ...headings.map(heading => ({ id: String(heading.id), name: heading.name }))],
        [headings]
    );

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(ItemFormSchema) as any,
        defaultValues: {
            name: "",
            teamId: "",
            headingId: "",
            status: true,
        },
    });

    useEffect(() => {
        if (open) {
            if (isEdit && item) {
                form.reset({
                    name: item.name ?? "",
                    teamId: item.teamId ? String(item.teamId) : "",
                    headingId: item.headingId ? String(item.headingId) : "",
                    status: item.status ?? true,
                });
            } else {
                form.reset({
                    name: "",
                    teamId: "",
                    headingId: "",
                    status: true,
                });
            }
            // Clear any previous errors
            createItem.reset?.();
            updateItem.reset?.();
        }
    }, [form, isEdit, item, open]);

    const saving = createItem.isPending || updateItem.isPending;
    const mutationError = createItem.error || updateItem.error;

    const handleSubmit = async (values: ItemFormValues) => {
        try {
            const payload = {
                name: values.name.trim(),
                teamId: values.teamId ? Number(values.teamId) : null,
                headingId: values.headingId ? Number(values.headingId) : null,
                status: values.status,
            };

            if (isEdit && item) {
                await updateItem.mutateAsync({ id: item.id, data: payload });
            } else {
                await createItem.mutateAsync(payload);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                                isEdit ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            )}
                        >
                            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>
                        <div className="space-y-1 flex-1">
                            <DialogTitle className="text-lg">{isEdit ? "Edit Item" : "Create New Item"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update the details for this item" : "Add a new item to the system"}</DialogDescription>
                        </div>
                        {isEdit && item && (
                            <Badge variant="secondary" className="font-mono text-xs shrink-0">
                                ID: {item.id}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <Separator />

                {/* Form Content */}
                <div className="px-6 py-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                    {/* Error Alert */}
                    {mutationError && (
                        <Alert variant="destructive" className="mb-5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(mutationError as any)?.message || "An error occurred. Please try again."}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form id="item-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Item Name Field */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                                Item Name
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[220px]">
                                                        <p className="text-xs">Enter a descriptive name for this item</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter item name"
                                                className={cn("h-10", form.formState.errors.name && "border-destructive focus-visible:ring-destructive")}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Team Selection */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                        Team
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                                            Optional
                                        </Badge>
                                    </Label>
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[220px]">
                                                <p className="text-xs">Assign this item to a specific team for better organization</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <SelectField control={form.control} name="teamId" options={teamOptions} placeholder="Select team" />
                            </div>

                            {/* Heading Selection */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                        Heading
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                                            Optional
                                        </Badge>
                                    </Label>
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[220px]">
                                                <p className="text-xs">Group this item under a heading for categorization</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <SelectField control={form.control} name="headingId" options={headingOptions} placeholder="Select heading" />
                            </div>

                            {/* Active Status Toggle */}
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <div
                                            className={cn(
                                                "flex items-center justify-between rounded-lg border p-4 transition-all duration-200",
                                                field.value ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-muted/30 border-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                                                        field.value
                                                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                                            : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    <div className={cn("h-2.5 w-2.5 rounded-full transition-colors", field.value ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <Label className="text-sm font-medium cursor-pointer">{field.value ? "Active" : "Inactive"}</Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {field.value ? "Item is visible and available for use" : "Item is hidden and disabled"}
                                                    </p>
                                                </div>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500" />
                                            </FormControl>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                <Separator />

                {/* Footer */}
                <DialogFooter className="px-6 py-4 bg-muted/30">
                    <div className="flex items-center justify-between w-full">
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            <span className="text-destructive">*</span> Required field
                        </p>
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="submit" form="item-form" disabled={saving} className="min-w-[110px]">
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isEdit ? "Saving..." : "Creating..."}
                                    </>
                                ) : isEdit ? (
                                    "Save Changes"
                                ) : (
                                    "Create Item"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
