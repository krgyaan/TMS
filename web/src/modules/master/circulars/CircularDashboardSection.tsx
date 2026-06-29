import { useState } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Plus, FileDown } from "lucide-react";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import type { Circular } from "@/types/api.types";
import { useCirculars, useDeleteCircular } from "@/hooks/api/useCirculars";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { CircularModal } from "./components/CircularModal";
import { CircularViewModal } from "./components/CircularViewModal";

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
};

const getFileUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
};

const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const CircularDashboardSection = () => {
    const { data: circulars, isLoading, error, refetch } = useCirculars();
    const deleteCircular = useDeleteCircular();

    const [drawerState, setDrawerState] = useState<{ open: boolean; circular: Circular | null }>({
        open: false,
        circular: null,
    });
    const [viewState, setViewState] = useState<{ open: boolean; circular: Circular | null }>({
        open: false,
        circular: null,
    });

    const circularActions: ActionItem<Circular>[] = [
        {
            label: "View",
            onClick: row => setViewState({ open: true, circular: row }),
        },
        {
            label: "Edit",
            onClick: row => setDrawerState({ open: true, circular: row }),
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async row => {
                if (!confirm(`Delete circular "${row.title}"?`)) {
                    return;
                }
                try {
                    await deleteCircular.mutateAsync(row.id);
                } catch (err) {
                    console.error("Delete failed:", err);
                }
            },
        },
    ];

    const colDefs: ColDef<Circular>[] = [
        { field: "title", headerName: "Title", flex: 1.2, minWidth: 200 },
        {
            field: "file",
            headerName: "Circular Document",
            flex: 1.5,
            minWidth: 250,
            cellRenderer: (params: any) => {
                if (!params.value) return "N/A";
                const filename = params.value.split("/").pop();
                return (
                    <a
                        href={getFileUrl(params.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:underline inline-flex items-center gap-1.5 font-medium"
                        onClick={e => e.stopPropagation()}
                    >
                        <FileDown className="h-4 w-4 text-teal-600 shrink-0" />
                        <span className="truncate">{filename}</span>
                    </a>
                );
            },
        },
        {
            field: "valid_from",
            headerName: "Valid From",
            width: 130,
            cellRenderer: (params: any) => formatDate(params.value),
        },
        {
            field: "expires_on",
            headerName: "Valid Till",
            width: 130,
            cellRenderer: (params: any) => formatDate(params.value),
        },
        {
            field: "status",
            headerName: "Status",
            width: 110,
            cellRenderer: (params: any) => (
                <Badge variant={params.value ? "default" : "secondary"}>
                    {params.value ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            headerName: "Actions",
            filter: false,
            cellRenderer: createActionColumnRenderer(circularActions),
            sortable: false,
            pinned: "right",
            width: 120,
        },
    ];

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
                    <CardTitle>Circulars</CardTitle>
                    <CardDescription>Manage all Circulars</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading All Circulars: {error.message}
                            <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Circulars</CardTitle>
                    <CardDescription>List of all Circulars</CardDescription>
                    <CardAction>
                        <Button variant="default" onClick={() => setDrawerState({ open: true, circular: null })}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Circular
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-3">
                    <DataTable
                        data={circulars || []}
                        columnDefs={colDefs}
                        gridOptions={{
                            defaultColDef: { editable: false, filter: true },
                            rowSelection,
                            pagination: true,
                        }}
                        enablePagination
                        enableRowSelection
                        selectionType="multiple"
                        onSelectionChanged={rows => console.log("Row Selected!", rows)}
                    />
                </CardContent>
            </Card>

            <CircularModal
                open={drawerState.open}
                onOpenChange={open => setDrawerState({ ...drawerState, open })}
                circular={drawerState.circular}
                onSuccess={() => {
                    refetch();
                    setDrawerState({ open: false, circular: null });
                }}
            />

            <CircularViewModal
                open={viewState.open}
                onOpenChange={open => setViewState({ ...viewState, open })}
                circular={viewState.circular}
            />
        </>
    );
};

export default CircularDashboardSection;