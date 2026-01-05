import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { useState } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useFollowupCategories } from "@/hooks/api/useFollowupCategories";
import type { FollowupCategory } from "@/types/api.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FollowupCategoryModal } from "./components/FollowupCategoryModal";
import { FollowupCategoryViewModal } from "./components/FollowupCategoryViewModal";

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
};

const FollowupCategoryPage = () => {
    const { data: categories, isLoading, error, refetch } = useFollowupCategories();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<FollowupCategory | null>(null);

    // Category actions
    const categoryActions: ActionItem<FollowupCategory>[] = [
        {
            label: "View",
            onClick: row => {
                setSelectedCategory(row);
                setViewModalOpen(true);
            },
        },
        {
            label: "Edit",
            onClick: row => {
                setSelectedCategory(row);
                setDrawerOpen(true);
            },
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async row => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        // await deleteCategory.mutateAsync(row.id);
                        console.log("Delete functionality to be implemented");
                    } catch (error) {
                        console.error("Delete failed:", error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<FollowupCategory>[]>([
        {
            headerName: "S.No.",
            valueGetter: "node.rowIndex + 1",
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: "name",
            headerName: "Category Name",
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
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(categoryActions),
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
                    <CardTitle>Followup Categories</CardTitle>
                    <CardDescription>Manage all followup categories</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading followup categories: {error.message}
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
            setSelectedCategory(null);
        }
    };

    const handleViewModalClose = (open: boolean) => {
        setViewModalOpen(open);
        if (!open) {
            setSelectedCategory(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Followup Categories</CardTitle>
                    <CardDescription>Manage categories for client followup tracking</CardDescription>
                    <CardAction>
                        <Button
                            variant="default"
                            onClick={() => {
                                setSelectedCategory(null);
                                setDrawerOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Category
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-3">
                    <DataTable
                        data={categories || []}
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
            <FollowupCategoryModal
                open={drawerOpen}
                onOpenChange={handleDrawerClose}
                followupCategory={selectedCategory}
                onSuccess={() => {
                    refetch();
                }}
            />
            <FollowupCategoryViewModal open={viewModalOpen} onOpenChange={handleViewModalClose} followupCategory={selectedCategory} />
        </>
    );
};

export default FollowupCategoryPage;
