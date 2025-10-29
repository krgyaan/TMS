import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card"
import DataTable from "@/components/ui/data-table"
import type { ColDef, RowSelectionOptions } from "ag-grid-community"
import { useState } from "react"
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer"
import type { ActionItem } from "@/components/ui/ActionMenu"
import { NavLink } from "react-router-dom"
import { paths } from "@/app/routes/paths"
import { useLocations, useDeleteLocation } from "@/hooks/api/useLocations"
import type { User } from "@/types/api.types"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
}

const Location = () => {
    // Use React Query hooks
    const { data: locations, isLoading, error, refetch } = useLocations()
    const deleteLocation = useDeleteLocation()

    // Employee actions with delete mutation
    const locationActions: ActionItem<User>[] = [
        {
            label: "Edit",
            onClick: (row) => {
                console.log("Edit", row)
            },
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete ${row.name}?`)) {
                    try {
                        await deleteLocation.mutateAsync(row.id)
                    } catch (error) {
                        // Error is already handled by the hook with toast
                        console.error('Delete failed:', error)
                    }
                }
            },
        },
    ]

    const [colDefs] = useState<ColDef[]>([
        { field: "acronym", headerName: "Acronym" },
        { field: "name", headerName: "Location" },
        { field: "state", headerName: "State" },
        { field: "region", headerName: "Region" },
        { field: "status", headerName: "Status" },
        {
            headerName: "Actions",
            field: "actions",
            filter: false,
            cellRenderer: createActionColumnRenderer(locationActions),
            sortable: false,
            pinned: "right"
        },
    ])

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
        )
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Location</CardTitle>
                    <CardDescription>List of all Location</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading Location: {error.message}
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
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>List of all Location</CardDescription>
                <CardAction>
                    <Button variant="default" asChild>
                        <NavLink to={paths.master.locations_create}>
                            Add New Location
                        </NavLink>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="h-screen px-0">
                <DataTable
                    data={locations || []}
                    columnDefs={colDefs}
                    loading={isLoading || deleteLocation.isPending}
                    gridOptions={{
                        defaultColDef: { editable: true, filter: true },
                        rowSelection,
                        pagination: true,
                    }}
                    enablePagination={true}
                    enableRowSelection={true}
                    selectionType="multiple"
                    onSelectionChanged={(rows) => console.log("Row Selected!", rows)}
                    height="100%"
                />
            </CardContent>
        </Card>
    )
}

export default Location
