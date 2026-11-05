import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { InventoryItem } from "@/types/inventory-item.types";
import { getCategory } from "./item-config";

export function InventoryItemViewDialog({ item, onOpenChange }: { item: InventoryItem | null; onOpenChange: (open: boolean) => void }) {
    const category = getCategory(item?.itemName);
    return <Dialog open={!!item} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{item?.itemName}</DialogTitle><DialogDescription>Complete item details</DialogDescription></DialogHeader>
            {item && <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div><span className="text-muted-foreground">Item Code</span><p>{item.itemCode}</p></div>
                <div><span className="text-muted-foreground">Team</span><p>{item.teamId === 1 ? "AC" : item.teamId === 2 ? "DC" : "—"}</p></div>
                <div><span className="text-muted-foreground">Item Type</span><p>{item.itemType || "—"}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></p></div>
                {category?.fields.map(field => <div key={field.key}><span className="text-muted-foreground">{field.label}</span><p>{item.specifications?.[field.key] || "—"}</p></div>)}
                <div><span className="text-muted-foreground">Unit</span><p>{item.unit}</p></div>
                <div><span className="text-muted-foreground">HSN Code</span><p>{item.hsnCode || "—"}</p></div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">Description</span><p>{item.description || "—"}</p></div>
                <div><span className="text-muted-foreground">Created At</span><p>{new Date(item.createdAt).toLocaleString("en-IN")}</p></div>
                <div><span className="text-muted-foreground">Updated At</span><p>{new Date(item.updatedAt).toLocaleString("en-IN")}</p></div>
            </div>}
        </DialogContent>
    </Dialog>;
}
