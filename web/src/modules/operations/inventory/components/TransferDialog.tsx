import { useEffect, useMemo } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import SelectField from "@/components/form/SelectField";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useCreateTransfer } from "@/hooks/api/useInventory";
import type { InventoryItem } from "../helpers/inventory.types";
import { ArrowRightLeft } from "lucide-react";

function makeTransferSchema(maxQty: number) {
    return z.object({
        toProjectId: z.number().int().positive({ message: "Destination project is required" }),
        qty: z
            .number()
            .positive({ message: "Quantity must be positive" })
            .refine(v => v <= maxQty, { message: `Quantity cannot exceed remaining (${maxQty})` }),
        price: z.number().nonnegative({ message: "Unit price cannot be negative" }),
        remark: z.string().max(500, { message: "Remark too long" }).optional(),
    });
}

type TransferFormValues = z.infer<ReturnType<typeof makeTransferSchema>>;

interface TransferDialogProps {
    item: InventoryItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TransferDialog: React.FC<TransferDialogProps> = ({ item, open, onOpenChange }) => {
    const { data: projects } = useProjectsMaster();
    const createTransfer = useCreateTransfer();

    const TransferSchema = useMemo(() => makeTransferSchema(item.remainingQty), [item.remainingQty]);

    const form = useForm<TransferFormValues>({
        resolver: zodResolver(TransferSchema),
        defaultValues: { toProjectId: undefined, qty: undefined, price: item.price, remark: "" },
    });

    useEffect(() => {
        if (!open) return;
        form.reset({ toProjectId: undefined, qty: undefined, price: item.price, remark: "" });
    }, [open, item, form]);

    const filteredProjects = useMemo(() => projects?.filter(p => p.id !== item.projectId) ?? [], [projects, item.projectId]);

    const onSubmit: SubmitHandler<TransferFormValues> = async values => {
        await createTransfer.mutateAsync({
            itemId: item.id,
            fromProject: item.projectId,
            toProject: values.toProjectId,
            qty: values.qty,
            price: values.price || undefined,
            remark: values.remark || undefined,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] md:max-w-[600px] lg:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5" />
                        Transfer Item
                    </DialogTitle>
                    <DialogDescription>
                        Transfer <strong>{item.itemName}</strong> from this project to another warehouse.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <SelectField
                            control={form.control}
                            name="toProjectId"
                            label="Transfer To Project"
                            options={filteredProjects.map(p => ({ id: String(p.id), name: `${p.projectName} (${p.projectCode})` }))}
                            placeholder="Select destination project"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FieldWrapper
                                control={form.control}
                                name="qty"
                                label={`Quantity (Max: ${item.remainingQty})`}
                            >
                                {field => <NumberInput value={field.value} onChange={field.onChange} min="0.01" max={item.remainingQty} step="0.01" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="price" label="Unit Price">
                                {field => <NumberInput value={field.value} onChange={field.onChange} min="0" step="0.01" />}
                            </FieldWrapper>
                        </div>

                        <FieldWrapper control={form.control} name="remark" label="Remark (optional)">
                            {field => (
                                <Input
                                    placeholder="Reason for transfer"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                />
                            )}
                        </FieldWrapper>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createTransfer.isPending}>
                                {createTransfer.isPending ? "Transferring..." : "Transfer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};