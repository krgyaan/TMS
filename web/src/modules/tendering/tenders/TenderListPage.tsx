import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { useState, useMemo, useEffect, useCallback } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { NavLink, useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { useDeleteTender, useTenders, useTendersDashboardCounts } from "@/hooks/api/useTenders";
import type { TenderInfoWithNames, TenderWithRelations, TenderWithTimer } from "./helpers/tenderInfo.types";
import { Eye, FilePlus, Pencil, Plus, Trash, Search, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { tenderNameCol } from "@/components/data-grid/columns";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { QuickFilter } from "@/components/ui/quick-filter";
import { ChangeStatusModal } from "./components/ChangeStatusModal";

type TenderDashboardTab = 'under-preparation' | 'did-not-bid' | 'tenders-bid' | 'tender-won' | 'tender-lost' | 'unallocated';

const TenderListPage = () => {
    const [activeTab, setActiveTab] = useState<TenderDashboardTab>('under-preparation');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [search, setSearch] = useState<string>('');
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const debouncedSearch = useDebouncedSearch(search, 300);

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);


    const handleSortChanged = useCallback((event: any) => {
        const sortModel = event.api.getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc'
            }));
        setSortModel(sortModel);
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);


    const { data: counts } = useTendersDashboardCounts();

    const getCategoryForTab = (tab: TenderDashboardTab): string | undefined => {
        const categoryMap: Record<TenderDashboardTab, string | undefined> = {
            'under-preparation': 'prep',
            'did-not-bid': 'dnb',
            'tenders-bid': 'bid',
            'tender-won': 'won',
            'tender-lost': 'lost',
            'unallocated': undefined,
        };
        return categoryMap[tab];
    };

    const { data: apiResponse, isLoading: tendersLoading } = useTenders(
        activeTab,
        getCategoryForTab(activeTab),
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
    );

    const deleteTender = useDeleteTender();
    const navigate = useNavigate();
    const [changeStatusModal, setChangeStatusModal] = useState<{ open: boolean; tenderId: number | null; currentStatus?: number | null }>({
        open: false,
        tenderId: null
    });

    // Handle both array (old format) and PaginatedResult (new format)
    const tenders = Array.isArray(apiResponse)
        ? apiResponse
        : (apiResponse?.data || []);
    const totalRows = Array.isArray(apiResponse)
        ? apiResponse.length
        : (apiResponse?.meta?.total || 0);

    const tabsConfig = useMemo(() => {
        return [
            {
                key: 'under-preparation' as TenderDashboardTab,
                name: 'Under Preparation',
                count: counts?.['under-preparation'] ?? 0,
            },
            {
                key: 'did-not-bid' as TenderDashboardTab,
                name: 'Did not Bid',
                count: counts?.['did-not-bid'] ?? 0,
            },
            {
                key: 'tenders-bid' as TenderDashboardTab,
                name: 'Tenders Bid',
                count: counts?.['tenders-bid'] ?? 0,
            },
            {
                key: 'tender-won' as TenderDashboardTab,
                name: 'Tender Won',
                count: counts?.['tender-won'] ?? 0,
            },
            {
                key: 'tender-lost' as TenderDashboardTab,
                name: 'Tender Lost',
                count: counts?.['tender-lost'] ?? 0,
            },
            {
                key: 'unallocated' as TenderDashboardTab,
                name: 'Unallocated',
                count: counts?.['unallocated'] ?? 0,
            },
        ];
    }, [counts]);

    const tenderActions: ActionItem<TenderWithTimer>[] = [
        {
            label: "Fill Info Sheet",
            onClick: (row: TenderWithRelations) => (row.infoSheet ? navigate(paths.tendering.infoSheetEdit(row.id)) : navigate(paths.tendering.infoSheetCreate(row.id))),
            icon: <FilePlus className="h-4 w-4" />,
        },
        {
            label: "Change Status",
            onClick: (row: TenderInfoWithNames) => setChangeStatusModal({ open: true, tenderId: row.id, currentStatus: row.status }),
            icon: <RefreshCw className="h-4 w-4" />,
        },
        {
            label: "View",
            onClick: (row: TenderInfoWithNames) => navigate(paths.tendering.tenderView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Edit",
            onClick: (row: TenderInfoWithNames) => navigate(paths.tendering.tenderEdit(row.id)),
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async row => {
                if (confirm(`Are you sure you want to delete tender "${row.tenderName}"?`)) {
                    try {
                        await deleteTender.mutateAsync(row.id);
                    } catch (error) {
                        console.error("Delete failed:", error);
                    }
                }
            },
            icon: <Trash className="h-4 w-4" />,
        },
    ];

    const [colDefs] = useState<ColDef<TenderWithTimer>[]>([
        tenderNameCol<TenderInfoWithNames>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 250,
        }),
        {
            field: "teamMemberName",
            headerName: "Member",
            width: 120,
            cellRenderer: (params: any) => {
                const { value, data } = params;
                return <span title={data?.teamMemberUsername}>{value ? value : <b className="text-gray-400">Unassigned</b>}</span>;
            },
        },
        {
            field: "gstValues",
            headerName: "Tender Value",
            filter: true,
            sortable: true,
            width: 130,
            cellRenderer: (p: { value: number | null | undefined }) => formatINR(p.value ?? 0),
        },
        {
            field: "tenderFees",
            headerName: "Tender Fee",
            filter: true,
            sortable: true,
            width: 120,
            cellRenderer: (p: { value: number | null | undefined }) => formatINR(p.value ?? 0),
        },
        {
            field: "emd",
            headerName: "EMD",
            filter: true,
            sortable: true,
            width: 100,
            cellRenderer: (p: { value: number | null | undefined }) => formatINR(p.value ?? 0),
        },
        {
            field: "dueDate",
            headerName: "Due Date",
            filter: true,
            sortable: true,
            width: 150,
            cellRenderer: (params: { value: string | Date }) => {
                return params.value ? formatDateTime(params.value) : "-";
            },
            comparator: (dateA, dateB) => {
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return new Date(dateA).getTime() - new Date(dateB).getTime();
            },
        },
        {
            field: "statusName",
            headerName: "Status",
            filter: true,
            sortable: true,
            width: 150,
            cellRenderer: (params: any) => {
                let status = params.data?.statusName;
                return <Badge variant='outline'>
                    {status}
                </Badge>
            },
        },
        {
            field: "timer",
            headerName: "Timer",
            width: 110,
            cellRenderer: (params: any) => {
                const { data } = params;
                const timer = data.timer;

                if (!timer) {
                    return <TenderTimerDisplay
                        remainingSeconds={0}
                        status="NOT_STARTED"
                    />;
                }
                return (
                    <TenderTimerDisplay
                        remainingSeconds={timer.remainingSeconds}
                        status={timer.status}
                    />
                );
            },
        },
        {
            headerName: "",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(tenderActions),
            pinned: "right",
            width: 57,
        },
    ]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">

            {/* 2. HEADER: Fixed height */}
            <CardHeader className="flex-none pb-4">
                <div className="flex justify-between">
                    <div>
                        <CardTitle>Tenders</CardTitle>
                        <CardDescription>Manage all tenders</CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="default" asChild>
                            <NavLink to={paths.tendering.tenderCreate}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add New Tender
                            </NavLink>
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>

            {/* 3. CONTENT: Flex-1 to take remaining space */}
            <CardContent className="flex-1 px-0">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as TenderDashboardTab)}
                    className="flex flex-col w-full"
                >
                    <div className="flex-none m-auto mb-4">
                        <TabsList>
                            {tabsConfig.map(tab => {
                                return (
                                    <TabsTrigger
                                        key={tab.key}
                                        value={tab.key}
                                        className="data-[state=active]:shadow-md flex items-center gap-1"
                                    >
                                        <span className="font-semibold text-sm">{tab.name}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {tab.count}
                                        </Badge>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    {/* Search Row: Quick Filters, Search Bar, Sort Filter */}
                    <div className="flex items-center gap-4 px-6 pb-4">
                        {/* Quick Filters (Left) */}
                        <QuickFilter options={[
                            { label: 'This Week', value: 'this-week' },
                            { label: 'This Month', value: 'this-month' },
                            { label: 'This Year', value: 'this-year' },
                        ]}
                            value={search}
                            onChange={(value) => setSearch(value)}
                        />

                        {/* Search Bar (Center) - Flex grow */}
                        <div className="flex-1 flex justify-end">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 w-64"
                                />
                            </div>
                        </div>

                    </div>

                    <div className="flex-1 min-h-0">
                        {tabsConfig.map(tab => (
                            <TabsContent
                                key={tab.key}
                                value={tab.key}
                                className="m-0 data-[state=inactive]:hidden"
                            >
                                {activeTab === tab.key && (
                                    <DataTable
                                        data={tenders}
                                        columnDefs={colDefs}
                                        loading={tendersLoading}
                                        manualPagination={true}
                                        rowCount={totalRows}
                                        paginationState={pagination}
                                        onPaginationChange={setPagination}
                                        onPageSizeChange={handlePageSizeChange}
                                        showTotalCount={true}
                                        showLengthChange={true}
                                        gridOptions={{
                                            defaultColDef: {
                                                filter: true,
                                                sortable: true,
                                            },
                                            onSortChanged: handleSortChanged,
                                        }}
                                        enableFiltering={true}
                                        enableSorting={true}
                                    />
                                )}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </CardContent>

            <ChangeStatusModal
                open={changeStatusModal.open}
                onOpenChange={(open) => setChangeStatusModal({ ...changeStatusModal, open })}
                tenderId={changeStatusModal.tenderId}
                currentStatus={changeStatusModal.currentStatus}
                onSuccess={() => {
                    setChangeStatusModal({ open: false, tenderId: null });
                }}
            />
        </Card>
    );
};

export default TenderListPage;
