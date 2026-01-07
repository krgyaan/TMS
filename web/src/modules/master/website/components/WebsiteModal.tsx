// components/WebsiteModal.tsx
import { useEffect } from "react";
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
import { useCreateWebsite, useUpdateWebsite } from "@/hooks/api/useWebsites";
import type { Website } from "@/types/api.types";
import { AlertCircle, HelpCircle, Loader2, Pencil, Plus, Globe, Link2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const WebsiteFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(255, "Name cannot exceed 255 characters"),
    url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
    status: z.boolean().default(true),
});

type WebsiteFormValues = z.infer<typeof WebsiteFormSchema>;

type WebsiteModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    website?: Website | null;
    onSuccess?: () => void;
};

export const WebsiteModal = ({ open, onOpenChange, website, onSuccess }: WebsiteModalProps) => {
    const createWebsite = useCreateWebsite();
    const updateWebsite = useUpdateWebsite();
    const isEdit = !!website;

    const form = useForm<WebsiteFormValues>({
        resolver: zodResolver(WebsiteFormSchema) as any,
        defaultValues: {
            name: "",
            url: "",
            status: true,
        },
    });

    useEffect(() => {
        if (open) {
            if (isEdit && website) {
                form.reset({
                    name: website.name || "",
                    url: website.url || "",
                    status: website.status ?? true,
                });
            } else {
                form.reset({
                    name: "",
                    url: "",
                    status: true,
                });
            }
            // Clear any previous errors
            createWebsite.reset?.();
            updateWebsite.reset?.();
        }
    }, [form, isEdit, website, open]);

    const saving = createWebsite.isPending || updateWebsite.isPending;
    const mutationError = createWebsite.error || updateWebsite.error;

    const handleSubmit = async (values: WebsiteFormValues) => {
        try {
            const payload = {
                name: values.name.trim(),
                url: values.url?.trim() || null,
                status: values.status,
            };

            if (isEdit && website) {
                await updateWebsite.mutateAsync({ id: website.id, data: payload });
            } else {
                await createWebsite.mutateAsync(payload);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    // Watch the URL field to show preview
    const currentUrl = form.watch("url");
    const isValidUrl = currentUrl && /^https?:\/\/.+/.test(currentUrl);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                                isEdit
                                    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                            )}
                        >
                            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>
                        <div className="space-y-1 flex-1">
                            <DialogTitle className="text-lg">{isEdit ? "Edit Website" : "Add New Website"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update the details for this website" : "Add a new website to track and manage"}</DialogDescription>
                        </div>
                        {isEdit && website && (
                            <Badge variant="secondary" className="font-mono text-xs shrink-0">
                                ID: {website.id}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <Separator />

                {/* Form Content */}
                <div className="px-6 py-5">
                    {/* Error Alert */}
                    {mutationError && (
                        <Alert variant="destructive" className="mb-5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(mutationError as any)?.message || "An error occurred. Please try again."}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form id="website-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Website Name Field */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                                Website Name
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[220px]">
                                                        <p className="text-xs">Enter a descriptive name to identify this website</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Company Portal, Documentation Site"
                                                className={cn("h-10", form.formState.errors.name && "border-destructive focus-visible:ring-destructive")}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* URL Field */}
                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                Website URL
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                                                    Optional
                                                </Badge>
                                            </FormLabel>
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[220px]">
                                                        <p className="text-xs">Enter the full URL including https://</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    placeholder="https://example.com"
                                                    type="url"
                                                    className={cn("h-10 pr-10", form.formState.errors.url && "border-destructive focus-visible:ring-destructive")}
                                                    {...field}
                                                />
                                                {isValidUrl && (
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <a
                                                                    href={currentUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="text-xs">Open in new tab</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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
                                                        {field.value ? "Website is live and visible in listings" : "Website is hidden and disabled"}
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
                            <Button type="submit" form="website-form" disabled={saving} className="min-w-[120px]">
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isEdit ? "Saving..." : "Creating..."}
                                    </>
                                ) : isEdit ? (
                                    "Save Changes"
                                ) : (
                                    "Add Website"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
