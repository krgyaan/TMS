import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DataTable from "@/components/ui/data-table"
import type { ColDef, ICellRendererParams, RowSelectionOptions } from "ag-grid-community";
import { useEffect, useState } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer"
import type { ActionItem } from "@/components/ui/ActionMenu"
import { NavLink } from "react-router-dom";
import { paths } from "@/app/routes/paths";

type User = {
    id: string;
    name: string;
    username?: string;
    email: string;
    team: string;
    role: string;
    designation: string;
}

const employeeActions: ActionItem<User>[] = [
    {
        label: "Edit",
        onClick: (row) => {
            console.log("Edit", row)
        },
    },
    {
        label: "Delete",
        className: "text-red-600",
        onClick: (row) => {
            console.log("Delete", row)
        },
    },
]

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
};

const Employees = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true)

    useEffect(() => {
        (async () => {
            try {
                setLoading(true)
                const res = await fetch("http://localhost:3000/api/v1/users")
                const data = await res.json()

                if (Array.isArray(data)) {
                    setUsers(data)
                } else {
                    setUsers([])
                }
            } catch (error) {
                setUsers([])
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const [colDefs] = useState<ColDef[]>([
        {
            field: "name",
            headerName: "Name",
            cellRenderer: ({ data }: ICellRendererParams) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{data.name}</div>
                    <div style={{ fontSize: '12px', color: 'gray' }}>@{data.username ?? (data.email ? data.email.split('@')[0] : '')}</div>
                </div>
            )
        },
        { field: "email", headerName: "Email" },
        { field: "team", headerName: "Team" },
        { field: "role", headerName: "Role" },
        { field: "designation", headerName: "Designation" },
        {
            headerName: "Actions",
            field: "actions",
            filter: false,
            cellRenderer: createActionColumnRenderer(employeeActions),
            sortable: false,
            pinned: "right"
        },
    ])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Employees</CardTitle>
                <CardDescription>List of all Emloyees</CardDescription>
                <CardAction>
                    <Button variant={"default"} asChild>
                        <NavLink to={paths.master.users_create}>
                            Add New Employee
                        </NavLink>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="h-screen px-0">
                <DataTable
                    data={users || []}
                    columnDefs={colDefs}
                    loading={loading}
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

export default Employees
