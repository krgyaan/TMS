import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Eye, FileEdit, FileX2, Pencil, Plus, Search, Trash, Truck } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import {
    useCourierDashboard,
    useCourierDashboardCounts,
    useDeleteCourier,
} from "@/hooks/api/useCourier";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/ui/data-table";
import type { ActionItem } from "@/components/ui/ActionMenu";

import { CourierStatusDialog } from "./components/CourierStatusDialog";
import { createCourierColumns } from "./components/courierColumns";
import { COURIER_STATUS, COURIER_TABS } from "./helpers/courier.constants";
import type { CourierDashboardRow, CourierTab } from "./helpers/courier.types";

const CourierListPage = () => {
    const navigate = useNavigate();
    const { canDelete } = useAuth();
    const deleteMutation = useDeleteCourier();

    const {
        activeTab,
        setActiveTab,
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState<CourierTab>({
        storageKey: "shared-couriers",
        defaultTab: "pending",
    });

    const queryParams = useMemo(
        () => ({
            tab: activeTab,
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
        }),
        [activeTab, pagination.pageIndex, pagination.pageSize, debouncedSearch, sortModel]
    );

    const { data: apiResponse, isLoading, error } = useCourierDashboard(queryParams);
    const { data: counts } = useCourierDashboardCounts();

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedCourier, setSelectedCourier] = useState<CourierDashboardRow | null>(null);

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const handleDelete = (row: CourierDashboardRow) => {
        if (window.confirm(`Are you sure you want to delete courier #${row.id}?`)) {
            deleteMutation.mutate(row.id);
        }
    };

    const courierActions: ActionItem<CourierDashboardRow>[] = [
        {
            label: "Status",
            icon: <FileEdit className="h-4 w-4" />,
            className: "text-blue-600",
            onClick: row => {
                setSelectedCourier(row);
                setStatusDialogOpen(true);
            },
        },
        {
            label: "Dispatch",
            icon: <Truck className="h-4 w-4" />,
            visible: row => row.status === COURIER_STATUS.PENDING,
            onClick: row => navigate(paths.shared.courierDispatch(row.id)),
        },
        {
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.courierView(row.id)),
        },
        {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.courierEdit(row.id)),
        },
        {
            label: "Delete",
            icon: <Trash className="h-4 w-4" />,
            className: "text-red-600",
            visible: () => canDelete("shared.couriers"),
            onClick: handleDelete,
        },
    ];

    const columnDefs = useMemo(
        () => createCourierColumns({ activeTab, actions: courierActions }),
        [activeTab, courierActions]
    );

    if (isLoading && !apiResponse) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-48" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Skeleton key={index} className="h-10 w-24 flex-1" />
                            ))}
                        </div>
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Couriers</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Failed to load couriers. Please try again later.</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Courier Dashboard</CardTitle>
                    <CardDescription className="mt-2">Manage courier requests and statuses</CardDescription>
                </div>
                <Button onClick={() => navigate(paths.shared.courierCreate)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Courier
                </Button>
            </CardHeader>

            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={value => setActiveTab(value as CourierTab)}>
                    <TabsList className="m-auto mb-4 flex flex-wrap">
                        {COURIER_TABS.map(tab => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="flex items-center gap-1 data-[state=active]:shadow-md"
                            >
                                <span className="text-sm font-semibold">{tab.label}</span>
                                {(counts?.[tab.key] ?? 0) > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {counts?.[tab.key]}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="flex items-center justify-end gap-4 px-6 pb-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search couriers..."
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                className="w-64 pl-8"
                            />
                        </div>
                    </div>

                    {COURIER_TABS.map(tab => (
                        <TabsContent key={tab.key} value={tab.key} className="m-0 px-0">
                            {activeTab === tab.key && (
                                <>
                                    {rows.length === 0 ? (
                                        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                                            <FileX2 className="mb-4 h-12 w-12" />
                                            <p className="text-lg font-medium">No {tab.label.toLowerCase()} couriers</p>
                                            <p className="mt-2 text-sm">
                                                Courier requests matching this tab will appear here
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable<CourierDashboardRow>
                                            data={rows}
                                            columnDefs={columnDefs}
                                            loading={isLoading}
                                            manualPagination
                                            rowCount={totalRows}
                                            paginationState={pagination}
                                            onPaginationChange={setPagination}
                                            onPageSizeChange={handlePageSizeChange}
                                            showTotalCount
                                            showLengthChange
                                            gridOptions={{
                                                defaultColDef: {
                                                    editable: false,
                                                    filter: true,
                                                    sortable: true,
                                                    resizable: true,
                                                },
                                                onSortChanged: handleSortChanged,
                                                overlayNoRowsTemplate:
                                                    '<span style="padding: 10px; text-align: center;">No couriers found</span>',
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>

            <CourierStatusDialog
                open={statusDialogOpen}
                onOpenChange={setStatusDialogOpen}
                courier={selectedCourier}
            />
        </Card>
    );
};

export default CourierListPage;
