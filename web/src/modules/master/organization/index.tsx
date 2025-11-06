import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { useState } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { NavLink, useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { useOrganizations } from "@/hooks/api/useOrganizations";
import type { Organization } from "@/types/api.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
};

const OrganizationPage = () => {
    const { data: organizations, isLoading, error, refetch } = useOrganizations();
    // const deleteOrganization = useDeleteOrganization();
    const navigate = useNavigate()

    // Organization actions
    const organizationActions: ActionItem<Organization>[] = [
        {
            label: "Edit",
            onClick: (row) => {
                console.log("Edit", row);
                navigate(paths.master.organizations_edit(row.id));
            },
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete ${row.name}?`)) {
                    try {
                        // await deleteOrganization.mutateAsync(row.id);
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<Organization>[]>([
        { field: "id", headerName: "ID", width: 80 },
        { field: "acronym", headerName: "Acronym", flex: 1 },
        { field: "name", headerName: "Organization Name", flex: 2 },
        {
            field: "industry", headerName: "Industry", flex: 1,
            valueGetter: (params) => params.data?.industry?.name || 'N/A',
            cellRenderer: (params: any) => {
                // const industry = params.data?.industry;
                // if (!industry) {
                //     return <span className="text-gray-400">No Industry</span>;
                // }
                return JSON.stringify(params.data);
            },
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            cellRenderer: (params: any) => (
                <span className={params.value ? 'text-green-600' : 'text-red-600'}>
                    {params.value ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            headerName: "Actions",
            filter: false,
            cellRenderer: createActionColumnRenderer(organizationActions),
            sortable: false,
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
                    <CardTitle>Organizations</CardTitle>
                    <CardDescription>Manage all organizations</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading organizations: {error.message}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                className="ml-4"
                            >
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>Manage all organizations and their industries</CardDescription>
                <CardAction>
                    <Button variant="default" asChild>
                        <NavLink to={paths.master.organizations_create}>
                            Add New Organization
                        </NavLink>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="h-screen px-0">
                <DataTable
                    data={organizations || []}
                    columnDefs={colDefs}
                    // loading={isLoading || deleteOrganization.isPending}
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
                    onSelectionChanged={(rows) => console.log("Selected rows:", rows)}
                    height="100%"
                />
            </CardContent>
        </Card>
    );
};

export default OrganizationPage;
