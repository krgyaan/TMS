// components/LocationModal.tsx
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
import { useStates } from "@/hooks/api/useStates";
import { useLocations } from "@/hooks/api/useLocations";
import { useCreateLocation, useUpdateLocation } from "@/hooks/api/useLocations";
import type { Location } from "@/types/api.types";
import { AlertCircle, HelpCircle, Loader2, Pencil, Plus, MapPin, Hash, Map, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const LocationFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    acronym: z.string().max(20, "Acronym cannot exceed 20 characters").optional().nullable(),
    state: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    status: z.boolean().default(true),
});

type LocationFormValues = z.infer<typeof LocationFormSchema>;

type LocationModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    location?: Location | null;
    onSuccess?: () => void;
};

export const LocationModal = ({ open, onOpenChange, location, onSuccess }: LocationModalProps) => {
    const { data: states = [] } = useStates();
    const { data: locations = [] } = useLocations();
    const createLocation = useCreateLocation();
    const updateLocation = useUpdateLocation();
    const isEdit = !!location;

    const stateOptions = useMemo<SelectOption[]>(
        () => [{ id: "", name: "No state selected" }, ...states.filter(s => s.status).map(state => ({ id: state.name, name: state.name }))],
        [states]
    );

    const regionOptions = useMemo<SelectOption[]>(
        () => [
            { id: "", name: "No region selected" },
            ...Array.from(new Set(locations.map(loc => loc.region).filter((value): value is string => Boolean(value && value.trim().length)))).map(region => ({
                id: region,
                name: region,
            })),
        ],
        [locations]
    );

    const form = useForm<LocationFormValues>({
        resolver: zodResolver(LocationFormSchema) as any,
        defaultValues: {
            name: "",
            acronym: "",
            state: "",
            region: "",
            status: true,
        },
    });

    useEffect(() => {
        if (open) {
            if (isEdit && location) {
                form.reset({
                    name: location.name ?? "",
                    acronym: location.acronym ?? "",
                    state: location.state ?? "",
                    region: location.region ?? "",
                    status: location.status ?? true,
                });
            } else {
                form.reset({
                    name: "",
                    acronym: "",
                    state: "",
                    region: "",
                    status: true,
                });
            }
            // Clear any previous errors
            createLocation.reset?.();
            updateLocation.reset?.();
        }
    }, [form, isEdit, location, open]);

    const saving = createLocation.isPending || updateLocation.isPending;
    const mutationError = createLocation.error || updateLocation.error;

    const handleSubmit = async (values: LocationFormValues) => {
        try {
            const payload = {
                name: values.name.trim(),
                acronym: values.acronym?.trim() ? values.acronym.trim() : null,
                state: values.state?.trim() ? values.state.trim() : null,
                region: values.region?.trim() ? values.region.trim() : null,
                status: values.status,
            };

            if (isEdit && location) {
                await updateLocation.mutateAsync({ id: location.id, data: payload as any });
            } else {
                await createLocation.mutateAsync(payload as any);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                                isEdit ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
                            )}
                        >
                            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>
                        <div className="space-y-1 flex-1">
                            <DialogTitle className="text-lg">{isEdit ? "Edit Location" : "Create New Location"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update the details for this location" : "Add a new location to the system"}</DialogDescription>
                        </div>
                        {isEdit && location && (
                            <Badge variant="secondary" className="font-mono text-xs shrink-0">
                                ID: {location.id}
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
                        <form id="location-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Location Name & Acronym Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Location Name Field */}
                                <div className="sm:col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                        Location Name
                                                        <span className="text-destructive">*</span>
                                                    </FormLabel>
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-[220px]">
                                                                <p className="text-xs">Enter the full name of the location (e.g., "New York City", "Los Angeles")</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter location name"
                                                        className={cn("h-10", form.formState.errors.name && "border-destructive focus-visible:ring-destructive")}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Acronym Field */}
                                <div className="sm:col-span-1">
                                    <FormField
                                        control={form.control}
                                        name="acronym"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                                        Acronym
                                                    </FormLabel>
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-[200px]">
                                                                <p className="text-xs">Short code or abbreviation (e.g., "NYC", "LA")</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g., NYC"
                                                        className={cn("h-10 uppercase", form.formState.errors.acronym && "border-destructive focus-visible:ring-destructive")}
                                                        maxLength={20}
                                                        {...field}
                                                        value={field.value ?? ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* State & Region Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* State Selection */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2 text-sm font-medium">
                                            <Map className="h-3.5 w-3.5 text-muted-foreground" />
                                            State
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                                                Optional
                                            </Badge>
                                        </Label>
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-[200px]">
                                                    <p className="text-xs">Select the state this location belongs to</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <SelectField control={form.control} name="state" options={stateOptions} placeholder="Select state" />
                                </div>

                                {/* Region Selection */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2 text-sm font-medium">
                                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                            Region
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                                                Optional
                                            </Badge>
                                        </Label>
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-[200px]">
                                                    <p className="text-xs">Assign this location to a geographic region</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <SelectField control={form.control} name="region" options={regionOptions} placeholder="Select region" />
                                </div>
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
                                                        {field.value ? "Location is visible and can be selected" : "Location is hidden from selection"}
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
                            <Button type="submit" form="location-form" disabled={saving} className="min-w-[120px]">
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isEdit ? "Saving..." : "Creating..."}
                                    </>
                                ) : isEdit ? (
                                    "Save Changes"
                                ) : (
                                    "Create Location"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
