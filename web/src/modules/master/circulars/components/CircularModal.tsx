import { useEffect, useState } from "react";
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
import { useCreateCircular, useUpdateCircular } from "@/hooks/api/useCirculars";
import type { Circular } from "@/types/api.types";
import { AlertCircle, HelpCircle, Loader2, Pencil, Plus, FileText, Calendar, ToggleLeft, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const CircularFormSchema = z.object({
    title: z.string().min(1, "Title is required").max(255, "Title cannot exceed 255 characters"),
    valid_from: z.string().min(1, "Valid from date is required"),
    expires_on: z.string().min(1, "Valid till date is required"),
    status: z.boolean().default(true),
});

type CircularFormValues = z.infer<typeof CircularFormSchema>;

type CircularModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    circular?: Circular | null;
    onSuccess?: () => void;
};

const formatDateForInput = (dateStr?: string | Date | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
};

export const CircularModal = ({ open, onOpenChange, circular, onSuccess }: CircularModalProps) => {
    const createCircular = useCreateCircular();
    const updateCircular = useUpdateCircular();
    const isEdit = !!circular;
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const form = useForm<CircularFormValues>({
        resolver: zodResolver(CircularFormSchema) as any,
        defaultValues: {
            title: "",
            valid_from: "",
            expires_on: "",
            status: true,
        },
    });

    useEffect(() => {
        if (open) {
            setSelectedFile(null);
            setFileError(null);
            if (isEdit && circular) {
                form.reset({
                    title: circular.title ?? "",
                    valid_from: formatDateForInput(circular.valid_from),
                    expires_on: formatDateForInput(circular.expires_on),
                    status: circular.status ?? true,
                });
            } else {
                form.reset({
                    title: "",
                    valid_from: "",
                    expires_on: "",
                    status: true,
                });
            }
            createCircular.reset?.();
            updateCircular.reset?.();
        }
    }, [form, isEdit, circular, open]);

    const saving = createCircular.isPending || updateCircular.isPending;
    const mutationError = createCircular.error || updateCircular.error;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];
            const fileExt = file.name.split(".").pop()?.toLowerCase();
            
            if (!fileExt || !allowedExtensions.includes(fileExt)) {
                setFileError(`Invalid file type. Allowed: ${allowedExtensions.join(", ")}`);
                setSelectedFile(null);
                return;
            }

            if (file.size > 20 * 1024 * 1024) {
                setFileError("File size exceeds 20MB limit");
                setSelectedFile(null);
                return;
            }

            setFileError(null);
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (values: CircularFormValues) => {
        // Validate file presence on create
        if (!isEdit && !selectedFile) {
            setFileError("Circular document file is required");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("title", values.title.trim());
            formData.append("valid_from", new Date(values.valid_from).toISOString());
            formData.append("expires_on", new Date(values.expires_on).toISOString());
            formData.append("status", String(values.status));
            
            if (selectedFile) {
                formData.append("file", selectedFile);
            }

            if (isEdit && circular) {
                await updateCircular.mutateAsync({ id: circular.id, data: formData });
            } else {
                await createCircular.mutateAsync(formData);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            // Error handling is handled by mutations
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
                            <DialogTitle className="text-lg">{isEdit ? "Edit Circular" : "Upload New Circular"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update the details or file for this circular" : "Add a new document notice to the portal"}</DialogDescription>
                        </div>
                        {isEdit && circular && (
                            <Badge variant="secondary" className="font-mono text-xs shrink-0">
                                ID: {circular.id}
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
                        <form id="circular-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Title Field */}
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                Circular Title
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter circular title"
                                                className={cn("h-10", form.formState.errors.title && "border-destructive focus-visible:ring-destructive")}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* File Upload Field */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium">
                                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                                    Circular Document
                                    {!isEdit && <span className="text-destructive">*</span>}
                                </Label>
                                <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition duration-200 relative">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={saving}
                                    />
                                    <Upload className="h-8 w-8 text-muted-foreground/60 mb-2" />
                                    <span className="text-xs font-medium text-foreground text-center">
                                        {selectedFile ? selectedFile.name : isEdit ? "Choose file to replace current document" : "Drag and drop or click to upload"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground text-center mt-1">
                                        Supported: PDF, DOC, DOCX, JPG, PNG (Max 20MB)
                                    </span>
                                </div>
                                {isEdit && circular && !selectedFile && (
                                    <div className="text-xs text-muted-foreground truncate">
                                        Current: <span className="font-mono">{circular.file.split("/").pop()}</span>
                                    </div>
                                )}
                                {fileError && <p className="text-[12px] font-medium text-destructive mt-1">{fileError}</p>}
                            </div>

                            {/* Valid From & Till Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="valid_from"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                Valid From
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    className="h-10"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="expires_on"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                Valid Till
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    className="h-10"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
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
                                                        {field.value ? "Circular is active and visible on the portal" : "Circular is hidden and inactive"}
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
                            <Button type="submit" form="circular-form" disabled={saving} className="min-w-[120px]">
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isEdit ? "Saving..." : "Creating..."}
                                    </>
                                ) : isEdit ? (
                                    "Save Changes"
                                ) : (
                                    "Upload Circular"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
