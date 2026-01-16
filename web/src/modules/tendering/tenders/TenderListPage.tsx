import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { useState, useMemo, useEffect } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { NavLink, useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { useDeleteTender, useTenders, useTendersDashboardCounts } from "@/hooks/api/useTenders";
import type { TenderInfoWithNames, TenderWithRelations } from "@/types/api.types";
import { Eye, FilePlus, Pencil, Plus, Trash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { tenderNameCol } from "@/components/data-grid/columns";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";

type TenderDashboardTab = 'under-preparation' | 'did-not-bid' | 'tenders-bid' | 'tender-won' | 'tender-lost' | 'unallocated';

const TenderListPage = () => {
    const [activeTab, setActiveTab] = useState<TenderDashboardTab>('under-preparation');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab]);

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
        { page: pagination.pageIndex + 1, limit: pagination.pageSize }
    );

    const deleteTender = useDeleteTender();
    const navigate = useNavigate();

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

    const tenderActions: ActionItem<TenderInfoWithNames>[] = [
        {
            label: "Fill Info Sheet",
            onClick: (row: TenderWithRelations) => (row.infoSheet ? navigate(paths.tendering.infoSheetEdit(row.id)) : navigate(paths.tendering.infoSheetCreate(row.id))),
            icon: <FilePlus className="h-4 w-4" />,
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

    const [colDefs] = useState<ColDef<TenderInfoWithNames>[]>([
        tenderNameCol<TenderInfoWithNames>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 250,
        }),
        {
            field: "teamMemberName",
            headerName: "Member",
            width: 150,
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
            width: 140,
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
            width: 120,
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
        },
        {
            field: "statusName",
            headerName: "Status",
            filter: true,
            sortable: true,
            width: 250,
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
            width: 150,
            cellRenderer: (params: any) => {
                const { data } = params;

                if (!data.timer) {
                    return <span className="text-gray-400">No timer</span>;
                }

                return (
                    <TenderTimerDisplay
                        remainingSeconds={data.timer.remainingSeconds}
                        status={data.timer.status}
                        stepKey={data.timer.stepKey}
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
                    <div className="flex-none m-auto">
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
                                        gridOptions={{
                                            defaultColDef: {
                                                filter: true,
                                                sortable: true,
                                            },
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
        </Card>
    );
};

export default TenderListPage;
