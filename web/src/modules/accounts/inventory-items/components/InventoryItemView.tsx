import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ItemMasterTeam } from "@/hooks/api/useInventoryItems";
import { paths } from "@/app/routes/paths";
import type { InventoryItem } from "@/types/inventory-item.types";
import { findCatalogItem } from "../helpers/inventoryItem.catalog";

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString("en-IN") : "—";
const formatFactor = (value?: string | null) => {
    if (!value) return "—";
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-IN", { maximumFractionDigits: 6 }) : value;
};

function DetailField({ label, children }: { label: string; children: ReactNode }) {
    return <div className="min-w-0 space-y-1"><dt className="text-sm font-medium text-muted-foreground">{label}</dt><dd className="break-words text-sm">{children || "—"}</dd></div>;
}

export default function InventoryItemView({ item, team }: { item: InventoryItem; team: Exclude<ItemMasterTeam, "master"> }) {
    const navigate = useNavigate();
    const listPath = team === "accounts" ? paths.accounts.itemMaster : paths.operations.itemMaster;
    const category = item.category || "Legacy";
    const catalogItem = findCatalogItem(category, item.itemName);
    const specificationLabels = new Map((catalogItem?.fields || []).map(field => [field.key, field.label]));
    const conversion = item.conversionUnit
        ? `1 ${item.unit} = ${formatFactor(item.conversionFactor)} ${item.conversionUnit}`
        : "No conversion";

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm text-muted-foreground">{team === "accounts" ? "Accounts" : "Operations"} / Item Master</p><h1 className="text-2xl font-semibold">{item.itemName}</h1></div>
            <Button variant="outline" className="min-h-11" onClick={() => navigate(listPath)}><ArrowLeft className="mr-2 h-4 w-4" />Back to Item Master</Button>
        </div>
        <Card>
            <CardHeader><CardTitle>Item details</CardTitle><CardDescription>All fields for this shared item.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <section className="space-y-3"><h2 className="font-semibold">Item information</h2><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Record ID">{item.id}</DetailField>
                    <DetailField label="Item code">{item.itemCode}</DetailField>
                    <DetailField label="Category">{category}</DetailField>
                    <DetailField label="Item group">{item.itemGroup}</DetailField>
                    <DetailField label="Item name">{item.itemName}</DetailField>
                    <DetailField label="Type">{item.itemType}</DetailField>
                    <DetailField label="Model Number">{item.modelNumber}</DetailField>
                    <DetailField label="HSN code">{item.hsnCode}</DetailField>
                    <DetailField label="Status"><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></DetailField>
                </dl></section>
                <section className="space-y-3"><h2 className="font-semibold">Specifications</h2>{Object.keys(item.specifications || {}).length ? <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(item.specifications || {}).map(([key, value]) => <DetailField key={key} label={specificationLabels.get(key) || key}>{value}</DetailField>)}
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
                    <DetailField label="Created by">{item.createdByName}</DetailField>
                    <DetailField label="Updated by">{item.updatedByName}</DetailField>
                </dl></section>
            </CardContent>
        </Card>
    </div>;
}
