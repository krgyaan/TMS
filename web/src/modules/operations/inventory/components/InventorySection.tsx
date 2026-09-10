import React, { useMemo, useState } from "react";
import { ArrowRightLeft, Eye, EyeOff } from "lucide-react";
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
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { useProjectInventory } from "@/hooks/api/useInventory";
import { formatINR } from "@/hooks/useINRFormatter";
import type { InventoryItem } from "../helpers/inventory.types";
import { TransferDialog } from "./TransferDialog";

interface InventorySectionProps {
    projectId: number | null;
}

export const InventorySection: React.FC<InventorySectionProps> = ({
    projectId,
}) => {
    const [showZero, setShowZero] = useState(false);
    const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);
    const { data, isLoading } = useProjectInventory(projectId!, showZero);

    const inventoryItems = data?.items ?? [];

    const inventoryActions: ActionItem<InventoryItem>[] = useMemo(
        () => [
            {
                label: "Transfer",
                icon: <ArrowRightLeft className="h-4 w-4" />,
                onClick: (row) => setTransferItem(row),
            },
        ],
        []
    );

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
                width: 120,
            },
            {
                field: "qty",
                headerName: "Qty",
                sortable: true,
                width: 100,
                valueFormatter: (p: ValueFormatterParams<InventoryItem>) =>
                    Number(p.value).toFixed(2),
            },
            {
                field: "remainingQty",
                headerName: "Available",
                sortable: true,
                width: 110,
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
                width: 130,
                valueFormatter: (p: ValueFormatterParams<InventoryItem>) =>
                    formatINR(p.value || 0),
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer<InventoryItem>(
                    inventoryActions
                ),
                width: 80,
                pinned: "right" as "right" | "left",
            },
        ],
        [inventoryActions]
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
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
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

            {transferItem && (
                <TransferDialog
                    item={transferItem}
                    open={!!transferItem}
                    onOpenChange={(open) => {
                        if (!open) setTransferItem(null);
                    }}
                />
            )}
        </Card>
    );
};
