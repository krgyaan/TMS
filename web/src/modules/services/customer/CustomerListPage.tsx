import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Plus, Eye, Pencil, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { useCustomers, useDeleteCustomer } from "@/hooks/api/useCustomer";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { dateCol } from "@/components/data-grid";
import { cn } from "@/lib/utils";
import type { CustomerComplaintDetail } from "./helpers/customer.types";

export default function CustomerListPage() {
    const navigate = useNavigate();
    const { data: complaints = [], isLoading } = useCustomers();
    const deleteCustomer = useDeleteCustomer();

    const { search, setSearch, debouncedSearch } = usePersistentTableState({
        storageKey: "customer-complaints-list",
        defaultTab: "all",
    });

    const rows = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase();
        if (!query) return complaints;
        return complaints.filter(row =>
            [row.name, row.organization, row.phone, row.email, row.siteProjectName, row.siteLocation, row.ticketNo]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query),
        );
    }, [complaints, debouncedSearch]);

    const handleDelete = async (row: CustomerComplaintDetail) => {
        await deleteCustomer.mutateAsync(row.id);
    };

    const actions: ActionItem<CustomerComplaintDetail>[] = [
        {
            label: "View",
            onClick: row => navigate(paths.services.customerView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Edit",
            onClick: row => navigate(paths.services.customerEdit(row.id)),
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: "Delete",
            onClick: handleDelete,
            icon: <Trash2 className="h-4 w-4" />,
            className: "text-destructive",
        },
    ];

    const colDefs = useMemo<ColDef<CustomerComplaintDetail>[]>(() => {
        return [
            { field: "ticketNo", headerName: "Ticket No.", minWidth: 130 },
            { field: "name", headerName: "Name", minWidth: 150 },
            { field: "organization", headerName: "Organization", minWidth: 150 },
            { field: "phone", headerName: "Phone No.", minWidth: 130 },
            { field: "email", headerName: "Email", minWidth: 180 },
            { field: "siteProjectName", headerName: "Site/Project Name", minWidth: 180 },
            { field: "siteLocation", headerName: "Site Location", minWidth: 160 },
            {
                colId: "status",
                headerName: "Status",
                width: 120,
                sortable: false,
                cellRenderer: (params: CustomCellRendererProps<CustomerComplaintDetail>) => {
                    const value = params.data?.status ?? "Pending";
                    return (
                        <Badge
                            className={cn(
                                "capitalize",
                                value === "Pending"
                                    ? "bg-amber-100 text-amber-800 border-transparent"
                                    : "bg-emerald-100 text-emerald-800 border-transparent",
                            )}
                        >
                            {value}
                        </Badge>
                    );
                },
            },
            dateCol("createdAt", { includeTime: false }, { headerName: "Created Date", width: 140 }),
            {
                colId: "actions",
                headerName: "Actions",
                width: 100,
                pinned: "right",
                sortable: false,
                filter: false,
                cellRenderer: createActionColumnRenderer(actions),
            },
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, deleteCustomer.isPending]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Customer Complaints</CardTitle>
                        <CardDescription>All customer complaints listed</CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.services.customerCreate)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Complaint
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search complaints..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>

                <DataTable
                    data={rows}
                    loading={isLoading || deleteCustomer.isPending}
                    columnDefs={colDefs}
                    gridOptions={{
                        defaultColDef: { filter: true, sortable: true },
                        pagination: true,
                    }}
                    enablePagination={true}
                />
            </CardContent>
        </Card>
    );
}
