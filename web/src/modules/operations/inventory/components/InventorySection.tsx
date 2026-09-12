import React, { useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { useProjectInventory } from "@/hooks/api/useInventory";
import { formatINR } from "@/hooks/useINRFormatter";
import type { InventoryItem, InventoryWarehouseFilter } from "../helpers/inventory.types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CustomCellRendererProps } from "ag-grid-react";
import { getShortId } from "@/lib/id-utils";
import { Badge } from "@/components/ui/badge";
import { paths } from "@/app/routes/paths";
import { useNavigate } from "react-router-dom";

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
    const navigate = useNavigate();
    const [showZero, setShowZero] = useState(false);
    const [warehouseTab, setWarehouseTab] = useState<InventoryWarehouseFilter>("all");
    const { data, isLoading } = useProjectInventory(projectId!, showZero, warehouseTab);

    const inventoryItems = useMemo(() => data?.items ?? [], [data]);

    const columns = useMemo<ColDef<InventoryItem>[]>(
        () => [
            {
                headerName: "Sr.No.",
                sortable: false,
                filter: false,
                maxWidth: 70,
                cellRenderer: (p: CustomCellRendererProps<InventoryItem>) => (
                    <span>{(p.node?.rowIndex ?? -1) + 1}</span>
                ),
            },
            {
                field: "itemName",
                headerName: "Item",
                sortable: true,
                filter: true,
                width: 400,
                minWidth: 350,
                wrapText: true,
                cellStyle: { wordBreak: "break-word", lineHeight: "16px" },
                cellClass: "pt-1",
            },
            {
                field: "sourcePoNumber",
                headerName: "PO No.",
                sortable: true,
                filter: true,
                maxWidth: 100,
                cellRenderer: (p: CustomCellRendererProps<InventoryItem>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>{getShortId(p.data?.sourcePoNumber)}</span>
                        </TooltipTrigger>
                        <TooltipContent>{p.data?.sourcePoNumber}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
            },
            {
                field: "warehouseType",
                headerName: "Warehouse",
                sortable: true,
                filter: true,
                width: 170,
                cellRenderer: (p: CustomCellRendererProps<InventoryItem>) => {
                    return warehouseTypeLabel(p.data?.warehouseType)
                }
            },
            {
                field: "qty",
                headerName: "Qty",
                sortable: true,
                width: 70
            },
            {
                field: "remainingQty",
                headerName: "Available",
                sortable: true,
                width: 70
            },
            {
                field: "price",
                headerName: "Price",
                sortable: true,
                width: 100,
                valueFormatter: (p: ValueFormatterParams<InventoryItem>) =>
                    formatINR(p.value || 0),
            }
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
                        <CardAction className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => navigate(paths.accounts.inventory)}
                                className="gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                All Inventories
                            </Button>
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
                        {"Total: "}
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
                        paginationPageSize: 50,
                        domLayout: "autoHeight",
                    }}
                />
            </CardContent>
        </Card>
    );
};


function warehouseTypeLabel(type: string | null | undefined): React.ReactNode {
    switch (type) {
        case "project_location":
            return <Badge variant={"outline"}>Project Inventory</Badge>;
        case "ho_sub":
            return <Badge variant={"secondary"}>HO Sub</Badge>;
        case "ho_main":
            return <Badge variant={"outline"}>HO Main</Badge>;
        default:
            return "—";
    }
}