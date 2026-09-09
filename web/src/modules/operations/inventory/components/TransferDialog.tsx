import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useCreateTransfer } from "@/hooks/api/useInventory";
import type { InventoryItem } from "../helpers/inventory.types";
import { ArrowRightLeft } from "lucide-react";

interface TransferDialogProps {
    item: InventoryItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TransferDialog: React.FC<TransferDialogProps> = ({
    item,
    open,
    onOpenChange,
}) => {
    const { data: projects } = useProjectsMaster();
    const createTransfer = useCreateTransfer();
    const [toProjectId, setToProjectId] = useState<string>("");
    const [qty, setQty] = useState<string>("");
    const [price, setPrice] = useState<string>(String(item.price));
    const [remark, setRemark] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!toProjectId || !qty || Number(qty) <= 0) return;

        await createTransfer.mutateAsync({
            itemId: item.id,
            fromProject: item.projectId,
            toProject: Number(toProjectId),
            qty: Number(qty),
            price: Number(price) || undefined,
            remark: remark || undefined,
        });

        setToProjectId("");
        setQty("");
        setRemark("");
        onOpenChange(false);
    };

    const filteredProjects = projects?.filter(
        (p: { id: number }) => p.id !== item.projectId
    ) ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5" />
                        Transfer Item
                    </DialogTitle>
                    <DialogDescription>
                        Transfer <strong>{item.itemName}</strong> from this
                        project to another warehouse.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="toProject">Transfer To Project</Label>
                        <Select
                            value={toProjectId}
                            onValueChange={setToProjectId}
                        >
                            <SelectTrigger id="toProject">
                                <SelectValue placeholder="Select destination project" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredProjects.map((p) => (
                                    <SelectItem
                                        key={p.id}
                                        value={String(p.id)}
                                    >
                                        {p.projectName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="qty">
                                Quantity (Max: {item.remainingQty})
                            </Label>
                            <Input
                                id="qty"
                                type="number"
                                min="0.01"
                                max={item.remainingQty}
                                step="0.01"
                                value={qty}
                                onChange={(e) => setQty(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Unit Price</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remark">Remark (optional)</Label>
                        <Input
                            id="remark"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Reason for transfer"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                !toProjectId ||
                                !qty ||
                                Number(qty) <= 0 ||
                                createTransfer.isPending
                            }
                        >
                            {createTransfer.isPending
                                ? "Transferring..."
                                : "Transfer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
