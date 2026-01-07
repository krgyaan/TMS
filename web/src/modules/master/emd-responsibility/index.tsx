import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { useState } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useEmdResponsibilities } from "@/hooks/api/useEmdResponsibility";
import type { EmdResponsibility } from "@/types/api.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmdResponsibilityModal } from "./components/EmdResponsibilityModal";
import { EmdResponsibilityViewModal } from "./components/EmdResponsibilityViewModal";

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
};

const EmdResponsibilityPage = () => {
    const { data: emdResponsibilities, isLoading, error, refetch } = useEmdResponsibilities();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedEmdResponsibility, setSelectedEmdResponsibility] = useState<EmdResponsibility | null>(null);

    const emdResponsibilityActions: ActionItem<EmdResponsibility>[] = [
        {
            label: "View",
            onClick: row => {
                setSelectedEmdResponsibility(row);
                setViewModalOpen(true);
            },
        },
        {
            label: "Edit",
            onClick: row => {
                setSelectedEmdResponsibility(row);
                setDrawerOpen(true);
            },
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async row => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        console.log("Delete functionality to be implemented");
                    } catch (error) {
                        console.error("Delete failed:", error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<EmdResponsibility>[]>([
        {
            headerName: "S.No.",
            valueGetter: "node.rowIndex + 1",
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: "name",
            headerName: "EMD Responsibility Name",
            flex: 2,
            filter: "agTextColumnFilter",
        },
        {
            field: "description",
            headerName: "Description",
            flex: 2,
            filter: "agTextColumnFilter",
            cellRenderer: (params: any) => {
                return params.value || <span className="text-gray-400">—</span>;
            },
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            filter: "agSetColumnFilter",
            cellRenderer: (params: any) => <Badge variant={params.value ? "default" : "secondary"}>{params.value ? "Active" : "Inactive"}</Badge>,
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(emdResponsibilityActions),
            pinned: "right",
            width: 100,
        },
    ]);

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

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>EMD Responsibility</CardTitle>
                    <CardDescription>Manage EMD responsibilities</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading EMD responsibilities: {error.message}
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
            setSelectedEmdResponsibility(null);
        }
    };

    const handleViewModalClose = (open: boolean) => {
        setViewModalOpen(open);
        if (!open) {
            setSelectedEmdResponsibility(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>EMD Responsibility</CardTitle>
                    <CardDescription>Manage EMD responsibility types</CardDescription>
                    <CardAction>
                        <Button
                            variant="default"
                            onClick={() => {
                                setSelectedEmdResponsibility(null);
                                setDrawerOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add EMD Responsibility
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-3">
                    <DataTable
                        data={emdResponsibilities || []}
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
            <EmdResponsibilityModal
                open={drawerOpen}
                onOpenChange={handleDrawerClose}
                emdResponsibility={selectedEmdResponsibility}
                onSuccess={() => {
                    refetch();
                }}
            />
            <EmdResponsibilityViewModal open={viewModalOpen} onOpenChange={handleViewModalClose} emdResponsibility={selectedEmdResponsibility} />
        </>
    );
};

export default EmdResponsibilityPage;
