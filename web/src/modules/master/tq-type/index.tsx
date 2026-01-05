import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { useState } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useTqTypes } from "@/hooks/api/useTqTypes";
import type { TqType } from "@/types/api.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TqTypeModal } from "./components/TqTypeModal";
import { TqTypeViewModal } from "./components/TqTypeViewModal";

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
};

const TqTypesPage = () => {
    const { data: tqTypes, isLoading, error, refetch } = useTqTypes();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedTqType, setSelectedTqType] = useState<TqType | null>(null);

    // TQ Type actions
    const tqTypeActions: ActionItem<TqType>[] = [
        {
            label: "View",
            onClick: row => {
                setSelectedTqType(row);
                setViewModalOpen(true);
            },
        },
        {
            label: "Edit",
            onClick: row => {
                setSelectedTqType(row);
                setDrawerOpen(true);
            },
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async row => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        // await deleteTqType.mutateAsync(row.id);
                        console.log("Delete functionality to be implemented");
                    } catch (error) {
                        console.error("Delete failed:", error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<TqType>[]>([
        {
            headerName: "S.No.",
            valueGetter: "node.rowIndex + 1",
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: "name",
            headerName: "TQ Type Name",
            flex: 2,
            filter: "agTextColumnFilter",
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            filter: "agSetColumnFilter",
            cellRenderer: (params: any) => <Badge variant={params.value ? "default" : "secondary"}>{params.value ? "Active" : "Inactive"}</Badge>,
        },
        {
            field: "createdAt",
            headerName: "Created At",
            width: 150,
            filter: "agDateColumnFilter",
            valueFormatter: params => (params.value ? new Date(params.value).toLocaleDateString() : ""),
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(tqTypeActions),
            pinned: "right",
            width: 100,
        },
    ]);

    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>TQ Types</CardTitle>
                    <CardDescription>Manage TQ types</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading TQ types: {error.message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const handleDrawerClose = (open: boolean) => {
        setDrawerOpen(open);
        if (!open) {
            setSelectedTqType(null);
        }
    };

    const handleViewModalClose = (open: boolean) => {
        setViewModalOpen(open);
        if (!open) {
            setSelectedTqType(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>TQ Types</CardTitle>
                    <CardDescription>Manage Technical/Quality classification types</CardDescription>
                    <CardAction>
                        <Button
                            variant="default"
                            onClick={() => {
                                setSelectedTqType(null);
                                setDrawerOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add TQ Type
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-3">
                    <DataTable
                        data={tqTypes || []}
                        columnDefs={colDefs}
                        gridOptions={{
                            defaultColDef: {
                                editable: false,
                                filter: true,
                                sortable: true,
                                resizable: true,
                            },
                            rowSelection,
                            pagination: true,
                            paginationPageSize: 20,
                            paginationPageSizeSelector: [10, 20, 50, 100],
                        }}
                        enablePagination={true}
                        enableRowSelection={true}
                        selectionType="multiple"
                        onSelectionChanged={rows => console.log("Selected rows:", rows)}
                        height="100%"
                    />
                </CardContent>
            </Card>
            <TqTypeModal
                open={drawerOpen}
                onOpenChange={handleDrawerClose}
                tqType={selectedTqType}
                onSuccess={() => {
                    refetch();
                }}
            />
            <TqTypeViewModal open={viewModalOpen} onOpenChange={handleViewModalClose} tqType={selectedTqType} />
        </>
    );
};

export default TqTypesPage;
