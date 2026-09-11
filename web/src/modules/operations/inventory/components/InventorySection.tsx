import React, { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { useProjectInventory } from "@/hooks/api/useInventory";
import { formatINR } from "@/hooks/useINRFormatter";
import type { InventoryItem, InventoryWarehouseFilter } from "../helpers/inventory.types";

interface InventorySectionProps {
    projectId: number | null;
}

const WAREHOUSE_TABS: { value: InventoryWarehouseFilter; label: string }[] = [
    { value: "all", label: "All Warehouses" },
    { value: "project_location", label: "At Project Location" },
    { value: "ho_depot", label: "In VEPL HO" },
];

export const InventorySection: React.FC<InventorySectionProps> = ({
    projectId,
}) => {
    const [showZero, setShowZero] = useState(false);
    const [warehouseTab, setWarehouseTab] = useState<InventoryWarehouseFilter>("all");
    const { data, isLoading } = useProjectInventory(projectId!, showZero, warehouseTab);

    const inventoryItems = data?.items ?? [];

    const columns = useMemo<ColDef<InventoryItem>[]>(
        () => [
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
                width: 110,
            },
            {
                field: "sourcePoNumber",
                headerName: "PO No.",
                sortable: true,
                filter: true,
                width: 170,
                valueGetter: p => p.data?.sourcePoNumber ?? "—",
            },
            {
                field: "warehouseType",
                headerName: "Warehouse",
                sortable: true,
                filter: true,
                width: 170,
                valueFormatter: (p: ValueFormatterParams<InventoryItem>) => warehouseTypeLabel(p.value),
            },
            {
                field: "qty",
                headerName: "Qty",
                sortable: true,
                width: 90,
                valueFormatter: (p: ValueFormatterParams<InventoryItem>) =>
                    Number(p.value).toFixed(2),
            },
            {
                field: "remainingQty",
                headerName: "Available",
                sortable: true,
                width: 100,
                cellRenderer: (p: { value: number }) => (
                    <Badge
                        variant={
                            Number(p.value) > 0 ? "default" : "secondary"
                        }
                    >
                        {Number(p.value).toFixed(2)}
                    </Badge>
                ),
            },
            {
                field: "price",
                headerName: "Price",
                sortable: true,
                width: 120,
                valueFormatter: (p: ValueFormatterParams<InventoryItem>) =>
                    formatINR(p.value || 0),
            },
        ],
        []
    );

    if (!projectId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="w-full">
                    <div className="flex justify-between items-center gap-2">
                        <CardTitle className="text-base font-semibold">
                            Project Inventory
                        </CardTitle>
                        <CardAction>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowZero(!showZero)}
                            >
                                {showZero ? (
                                    <EyeOff className="mr-1.5 h-4 w-4" />
                                ) : (
                                    <Eye className="mr-1.5 h-4 w-4" />
                                )}
                                {showZero ? "Hide Zero" : "Show Zero"}
                            </Button>
                        </CardAction>
                    </div>
                    <CardDescription>
                        {inventoryItems.length} item
                        {inventoryItems.length !== 1 ? "s" : ""} in stock
                        {warehouseTab !== "all"
                            ? ` — ${WAREHOUSE_TABS.find(t => t.value === warehouseTab)?.label}`
                            : ""}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Tabs value={warehouseTab} onValueChange={v => setWarehouseTab(v as InventoryWarehouseFilter)} className="mb-3">
                    <TabsList>
                        {WAREHOUSE_TABS.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                <DataTable
                    data={inventoryItems}
                    columnDefs={columns}
                    gridOptions={{
                        pagination: true,
                        paginationPageSize: 10,
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>
        </Card>
    );
};

function warehouseTypeLabel(type: string | null | undefined): string {
    switch (type) {
        case "project_location":
            return "Project Location";
        case "ho_sub":
            return "VEPL HO (Project)";
        case "ho_main":
            return "VEPL HO (Main)";
        default:
            return "—";
    }
}