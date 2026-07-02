import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Plus, Pencil, ShieldCheck, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useCreateEmdResponsibility, useUpdateEmdResponsibility } from "@/hooks/api/useEmdResponsibility";
import { useGetTeamMembers } from "@/hooks/api/useUsers";

import type { EmdResponsibility } from "@/types/api.types";

const EmdResponsibilityFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(255),
    instrumentType: z.string().max(30).optional(),
    assignedUserId: z.coerce.number().int().positive().optional(),
});

type EmdResponsibilityFormValues = z.infer<typeof EmdResponsibilityFormSchema>;

type EmdResponsibilityModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    emdResponsibility?: EmdResponsibility | null;
    onSuccess?: () => void;
};

export const EmdResponsibilityModal = ({ open, onOpenChange, emdResponsibility, onSuccess }: EmdResponsibilityModalProps) => {
    const createEmdResponsibility = useCreateEmdResponsibility();
    const updateEmdResponsibility = useUpdateEmdResponsibility();

    const isEdit = !!emdResponsibility;
    const { data: accountsUsers = [], isLoading: usersLoading } = useGetTeamMembers(5);

    const form = useForm<EmdResponsibilityFormValues>({
        resolver: zodResolver(EmdResponsibilityFormSchema),
        defaultValues: {
            name: "",
            instrumentType: "",
            assignedUserId: undefined,
        },
    });

    useEffect(() => {
        if (!open) return;

        if (isEdit && emdResponsibility) {
            form.reset({
                name: emdResponsibility.name ?? "",
                instrumentType: emdResponsibility.instrumentType ?? "",
                assignedUserId: emdResponsibility.assignedUserId ?? undefined,
            });
        } else {
            form.reset({
                name: "",
                instrumentType: "",
                assignedUserId: undefined,
            });
        }

        createEmdResponsibility.reset?.();
        updateEmdResponsibility.reset?.();
    }, [open, isEdit, emdResponsibility, form]);

    const saving = createEmdResponsibility.isPending || updateEmdResponsibility.isPending;

    const handleSubmit = async (values: EmdResponsibilityFormValues) => {
        try {
            if (isEdit && emdResponsibility) {
                await updateEmdResponsibility.mutateAsync({
                    id: emdResponsibility.id,
                    data: values,
                });
            } else {
                await createEmdResponsibility.mutateAsync(values);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch {
            // handled in hooks
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-full",
                                isEdit ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            )}
                        >
                            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>

                        <div className="flex-1 space-y-1">
                            <DialogTitle className="text-lg">{isEdit ? "Edit EMD Responsibility" : "Create EMD Responsibility"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update EMD responsibility details" : "Add a new EMD responsibility to the system"}</DialogDescription>
                        </div>

                        {isEdit && emdResponsibility && (
                            <Badge variant="secondary" className="font-mono text-xs">
                                ID: {emdResponsibility.id}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <Separator />

                {/* Form */}
                <div className="px-6 py-5">
                    <Form {...form}>
                        <form id="emd-responsibility-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                            Name
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter EMD responsibility name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Instrument Type */}
                            <FormField
                                control={form.control}
                                name="instrumentType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Instrument Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select instrument type (optional)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="DD">DD</SelectItem>
                                                <SelectItem value="FDR">FDR</SelectItem>
                                                <SelectItem value="BG">BG</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="Portal Payment">Portal Payment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Assigned User */}
                            <FormField
                                control={form.control}
                                name="assignedUserId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            Assigned User
                                        </FormLabel>
                                        <Select
                                            onValueChange={v => field.onChange(v ? Number(v) : undefined)}
                                            value={field.value ? String(field.value) : ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={usersLoading ? "Loading users..." : "Select assigned user (optional)"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accountsUsers.map(user => (
                                                    <SelectItem key={user.id} value={String(user.id)}>
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                <Separator />

                {/* Footer */}
                <DialogFooter className="px-6 py-4 bg-muted/30">
                    <div className="flex gap-2 w-full">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="w-1/2">
                            Cancel
                        </Button>

                        <Button type="submit" form="emd-responsibility-form" disabled={saving} className="w-1/2">
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : isEdit ? (
                                "Update"
                            ) : (
                                "Create"
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
