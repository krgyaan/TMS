import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/data-table";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { useAllInventory } from "@/hooks/api/useInventory";
import { formatINR } from "@/hooks/useINRFormatter";
import type { InventoryItem } from "../helpers/inventory.types";
import { Eye, Search } from "lucide-react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";

interface RowType extends InventoryItem {
    projectName?: string;
}

export default function InventoryPage() {
    const [search, setSearch] = useState("");
    const [showZero, setShowZero] = useState(false);
    const { data, isLoading } = useAllInventory(showZero);

    const inventoryItems = useMemo(
        () => (data?.items ?? []) as RowType[],
        [data?.items]
    );

    const filtered = useMemo(() => {
        if (!search.trim()) return inventoryItems;
        const q = search.toLowerCase();
        return inventoryItems.filter(
            (i) =>
                i.itemName?.toLowerCase().includes(q) ||
                i.hsn?.toLowerCase().includes(q) ||
                i.projectName?.toLowerCase().includes(q)
        );
    }, [inventoryItems, search]);

    const inventoryActions: ActionItem<InventoryItem>[] = [
        {
            label: "View Details",
            onClick: () => {
                // Implement view details action
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const columns = useMemo<ColDef<RowType>[]>(
        () => [
            {
                field: "projectName",
                headerName: "Project",
                sortable: true,
                filter: true,
                flex: 1,
                minWidth: 200,
            },
            {
                field: "itemName",
                headerName: "Item",
                sortable: true,
                filter: true,
                flex: 1,
                minWidth: 200,
            },
            {
                field: "hsn",
                headerName: "HSN",
                sortable: true,
                filter: true,
                width: 120,
            },
            {
                field: "qty",
                headerName: "Qty",
                sortable: true,
                width: 100,
                valueFormatter: (p: ValueFormatterParams<RowType>) =>
                    Number(p.value).toFixed(2),
            },
            {
                field: "remainingQty",
                headerName: "Available",
                sortable: true,
                width: 110,
                cellRenderer: (p: { value: number }) => (
                    <Badge variant={Number(p.value) > 0 ? "default" : "secondary"}>
                        {Number(p.value).toFixed(2)}
                    </Badge>
                ),
            },
            {
                field: "price",
                headerName: "Price",
                sortable: true,
                width: 130,
                valueFormatter: (p: ValueFormatterParams<RowType>) =>
                    formatINR(p.value || 0),
            },
            {
                headerName: "",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(inventoryActions),
                pinned: "right",
                width: 57,
            },
        ],
        []
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
                <p className="text-muted-foreground">
                    View and manage project-wise inventory across all projects.
                </p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="w-full">
                        <div className="flex justify-between items-center gap-2">
                            <CardTitle className="text-base font-semibold">
                                All Inventory
                                <Badge variant="secondary" className="ml-2">
                                    {filtered.length} item{filtered.length > 1 ? "s" : ""}
                                </Badge>
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search items..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-8 w-64"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowZero(!showZero)}
                                >
                                    {showZero ? "Hide Zero" : "Show Zero"}
                                </Button>
                            </div>
                        </div>
                        <CardDescription>
                            View and manage project-wise inventory across all projects.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <DataTable
                        data={filtered}
                        columnDefs={columns}
                        gridOptions={{
                            pagination: true,
                            paginationPageSize: 25,
                            domLayout: "autoHeight",
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
