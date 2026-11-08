import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryItem, type ItemMasterTeam } from "@/hooks/api/useInventoryItems";
import { paths } from "@/app/routes/paths";
import type { InventoryItem } from "@/types/inventory-item.types";

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("en-IN") : "—";
const formatFactor = (value?: string | null) => {
    if (!value) return "—";
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-IN", { maximumFractionDigits: 6 }) : value;
};

function DetailField({ label, children }: { label: string; children: ReactNode }) {
    return <div className="min-w-0 space-y-1"><dt className="text-sm font-medium text-muted-foreground">{label}</dt><dd className="break-words text-sm">{children || "—"}</dd></div>;
}

export default function InventoryItemDetailPage({ team }: { team: Exclude<ItemMasterTeam, "master"> }) {
    const { id: rawId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const id = Number(rawId);
    const { data: item, isLoading, error, refetch } = useInventoryItem(team, id);
    const listPath = team === "accounts" ? paths.accounts.itemMaster : paths.operations.itemMaster;

    if (!Number.isInteger(id) || id <= 0) return <Card><CardHeader><CardTitle>Item not found</CardTitle><CardDescription>Invalid item identifier.</CardDescription></CardHeader></Card>;
    if (isLoading) return <Card><CardHeader><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}</CardContent></Card>;
    if (error || !item) return <Card><CardHeader><CardTitle>Item details</CardTitle><CardDescription>Unable to load this shared item.</CardDescription></CardHeader><CardContent><Alert variant="destructive" className="mb-4"><AlertDescription>{error instanceof Error ? error.message : "Item not found."}</AlertDescription></Alert><Button variant="outline" onClick={() => void refetch()}>Retry</Button></CardContent></Card>;

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm text-muted-foreground">{team === "accounts" ? "Accounts" : "Operations"} / Item Master</p><h1 className="text-2xl font-semibold">{item.itemName}</h1></div>
            <Button variant="outline" className="min-h-11" onClick={() => navigate(listPath)}><ArrowLeft className="mr-2 h-4 w-4" />Back to Item Master</Button>
        </div>
        <ItemDetails item={item} />
    </div>;
}

function ItemDetails({ item }: { item: InventoryItem }) {
    const teamName = item.teamId === 1 ? "AC" : item.teamId === 2 ? "DC" : `Team ${item.teamId}`;
    const conversion = item.conversionUnit
        ? `1 ${item.unit} = ${formatFactor(item.conversionFactor)} ${item.conversionUnit}`
        : "No conversion";
    return <Card>
        <CardHeader><CardTitle>Item details</CardTitle><CardDescription>All fields for this shared item.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <section className="space-y-3"><h2 className="font-semibold">Item information</h2><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Record ID">{item.id}</DetailField>
                <DetailField label="Item code">{item.itemCode}</DetailField>
                <DetailField label="Team">{teamName}</DetailField>
                <DetailField label="Item group">{item.itemGroup}</DetailField>
                <DetailField label="Item name">{item.itemName}</DetailField>
                <DetailField label="Type">{item.itemType}</DetailField>
                <DetailField label="HSN code">{item.hsnCode}</DetailField>
                <DetailField label="Status"><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></DetailField>
            </dl></section>
            <section className="space-y-3"><h2 className="font-semibold">Specifications</h2>{Object.keys(item.specifications || {}).length ? <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(item.specifications || {}).map(([key, value]) => <DetailField key={key} label={key}>{value}</DetailField>)}
            </dl> : <p className="text-sm text-muted-foreground">No specifications recorded.</p>}</section>
            <section className="space-y-3"><h2 className="font-semibold">Unit & conversion</h2><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Unit">{item.unit}</DetailField>
                <DetailField label="Convert to">{item.conversionUnit}</DetailField>
                <DetailField label="Conversion factor">{item.conversionFactor}</DetailField>
                <DetailField label="Conversion">{conversion}</DetailField>
                <DetailField label="Stored conversion label">{item.conversion?.value}</DetailField>
            </dl></section>
            <section className="space-y-3"><h2 className="font-semibold">Description</h2><p className="whitespace-pre-wrap break-words text-sm">{item.description || "—"}</p></section>
            <section className="space-y-3"><h2 className="font-semibold">Record history</h2><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Created">{formatDate(item.createdAt)}</DetailField>
                <DetailField label="Updated">{formatDate(item.updatedAt)}</DetailField>
                <DetailField label="Deleted">{formatDate(item.deletedAt)}</DetailField>
            </dl></section>
        </CardContent>
    </Card>;
}
