import { useEffect } from "react";  // ← REMOVED useState
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, UserPlus } from "lucide-react";
import { SelectField } from "@/components/form/SelectField";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { useAllocateLead, useLead } from "@/hooks/api/useLeads";
import { useUsers } from "@/hooks/api/useUsers";

// ─── Schema ───────────────────────────────────────────────────────────────────

const AllocationSchema = z.object({
    te_id: z.string().min(1, { message: "Please select a Technical Executive" }),
    allocation_notes: z.string().max(2000).optional(),
});

type AllocationFormValues = z.infer<typeof AllocationSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadAllocationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: number | null;
    leadName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadAllocationModal({
    open,
    onOpenChange,
    leadId,
    leadName,
}: LeadAllocationModalProps) {
    const allocateLead = useAllocateLead();

    // ── Fetch lead data (only when leadId is valid) ───────────────────
    const { data: lead } = useLead(leadId ?? 0);

    // ── Fetch all users ───────────────────────────────────────────────
    const { data: allUsers = [], isLoading: teLoading } = useUsers();

    // ── Build dropdown options ────────────────────────────────────────
    const teOptions = allUsers.map((u) => ({
        value: u.id.toString(),
        label: u.team?.name ? `${u.name} (${u.team.name})` : (u.name ?? ""),
    }));

    // ── Form setup ───────────────────────────────────────────────────
    const form = useForm<AllocationFormValues>({
        resolver: zodResolver(AllocationSchema),
        defaultValues: {
            te_id: "",
            allocation_notes: "",
        },
    });

    // ── Reset form when modal opens with new lead ─────────────────────
    useEffect(() => {
        if (open && lead) {
            form.reset({
                te_id: lead.allocatedTe?.toString() ?? "",
                allocation_notes: lead.allocationNotes ?? "",
            });
        } else if (!open) {
            form.reset({
                te_id: "",
                allocation_notes: "",
            });
        }
    }, [open, lead, form]);

    // ── Submit ───────────────────────────────────────────────────────
    const handleSubmit: SubmitHandler<AllocationFormValues> = async (values) => {
        if (!leadId) return;

        try {
            await allocateLead.mutateAsync({
                id: leadId,
                data: {
                    allocatedTe: Number(values.te_id),
                    allocationNotes: values.allocation_notes || null,
                },
            });
            handleClose();
        } catch {
            // error handled by hook via toast
        }
    };

    const handleClose = () => {
        form.reset();
        onOpenChange(false);
    };

    const saving = allocateLead.isPending;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Allocate to Technical Executive
                    </DialogTitle>
                    <DialogDescription>
                        Allocating lead: <strong>{leadName || "—"}</strong>
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
                        
                        {/* ── TE Selector ─────────────────────────── */}
                        <SelectField<AllocationFormValues, "te_id">
                            control={form.control}
                            name="te_id"
                            label="Select Technical Executive"
                            options={teOptions}
                            placeholder={
                                teLoading ? "Loading executives..." : "-- Select TE --"
                            }
                            disabled={teLoading || saving}
                        />

                        {/* ── Allocation Notes ────────────────────── */}
                        <FieldWrapper<AllocationFormValues, "allocation_notes">
                            control={form.control}
                            name="allocation_notes"
                            label="Allocation Notes"
                        >
                            {(field) => (
                                <textarea
                                    className="border-input placeholder:text-muted-foreground dark:bg-input/30 h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    placeholder="Enter any notes about this allocation..."
                                    maxLength={2000}
                                    disabled={saving}
                                    {...field}
                                />
                            )}
                        </FieldWrapper>

                    </form>
                </Form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={saving || teLoading}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Allocating...
                            </>
                        ) : (
                            <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Allocate TE
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}