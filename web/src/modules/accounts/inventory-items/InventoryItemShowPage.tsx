import { useParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryItem, type ItemMasterTeam } from "@/hooks/api/useInventoryItems";
import InventoryItemView from "./components/InventoryItemView";

export default function InventoryItemShowPage({ team }: { team: Exclude<ItemMasterTeam, "master"> }) {
    const { id: rawId } = useParams<{ id: string }>();
    const id = Number(rawId);
    const { data: item, isLoading, error, refetch } = useInventoryItem(team, id);

    if (!Number.isInteger(id) || id <= 0) {
        return <Card><CardHeader><CardTitle>Item not found</CardTitle><CardDescription>Invalid item identifier.</CardDescription></CardHeader></Card>;
    }
    if (isLoading) {
        return <Card><CardHeader><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}</CardContent></Card>;
    }
    if (error || !item) {
        return <Card><CardHeader><CardTitle>Item details</CardTitle><CardDescription>Unable to load this shared item.</CardDescription></CardHeader><CardContent><Alert variant="destructive" className="mb-4"><AlertDescription>{error instanceof Error ? error.message : "Item not found."}</AlertDescription></Alert><Button variant="outline" onClick={() => void refetch()}>Retry</Button></CardContent></Card>;
    }

    return <InventoryItemView item={item} team={team} />;
}
