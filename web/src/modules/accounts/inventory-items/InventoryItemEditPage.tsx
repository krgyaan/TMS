import { useParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useInventoryItem } from "@/hooks/api/useInventoryItems";
import InventoryItemForm from "./components/InventoryItemForm";

export default function InventoryItemEditPage() {
    const { id: rawId } = useParams<{ id: string }>();
    const itemId = rawId ? Number(rawId) : 0;
    const { canUpdate } = useAuth();
    const { data: item, isLoading, error, refetch } = useInventoryItem("master", itemId);

    if (!canUpdate("master.item-master")) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        You don&apos;t have permission to edit item master records.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!Number.isInteger(itemId) || itemId <= 0) {
        return <Card><CardHeader><CardTitle>Item not found</CardTitle><CardDescription>Invalid item identifier.</CardDescription></CardHeader></Card>;
    }
    if (isLoading) {
        return <Card><CardHeader><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>;
    }
    if (error || !item) {
        return <Card><CardHeader><CardTitle>Edit Item</CardTitle><CardDescription>Unable to load this item.</CardDescription></CardHeader><CardContent><Alert variant="destructive" className="mb-4"><AlertDescription>{error instanceof Error ? error.message : "Item not found."}</AlertDescription></Alert><Button variant="outline" onClick={() => void refetch()}>Retry</Button></CardContent></Card>;
    }

    return <InventoryItemForm mode="edit" existingData={item} />;
}
