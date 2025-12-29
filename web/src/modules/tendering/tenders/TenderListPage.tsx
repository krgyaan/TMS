import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { useState, useMemo, useEffect } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { NavLink, useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { useDeleteTender, useTenders } from "@/hooks/api/useTenders";
import { useStatuses } from "@/hooks/api/useStatuses";
import type { TenderInfoWithNames, TenderWithRelations } from "@/types/api.types";
import { Eye, FilePlus, Pencil, Plus, Trash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { tenderNameCol } from "@/components/data-grid/columns";

const TenderListPage = () => {
    const { data: statuses } = useStatuses();
    const [activeTab, setActiveTab] = useState<string>("");
    const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab]);

    const TC = {
        prep: "Under Preperation",
        dnb: "Did Not BId",
        bid: "Bid Submitted",
        won: "Won",
        lost: "Lost",
        unallocated: "Unallocated",
    } as const;
    type TenderCategoryKey = keyof typeof TC;

    const categories = useMemo(() => {
        if (!statuses) return [];
        const categoryMap = new Map<string, number[]>();
        statuses.forEach(status => {
            if (status.tenderCategory) {
                const category = status.tenderCategory;
                if (!categoryMap.has(category)) categoryMap.set(category, []);
                categoryMap.get(category)?.push(status.id);
            }
        });
        const categoriesArray = Array.from(categoryMap.entries()).map(([name, statusIds]) => ({
            name,
            label: TC[name as TenderCategoryKey] ?? name.charAt(0).toUpperCase() + name.slice(1),
            statusIds,
        }));

        categoriesArray.push({ name: "unallocated", label: "Unallocated", statusIds: [] });
        return categoriesArray;
    }, [statuses]);

    useEffect(() => {
        if (categories.length > 0 && !activeTab) setActiveTab(categories[0].name);
    }, [categories, activeTab]);

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab]);

    const selectedStatusIds = useMemo(() => categories.find(c => c.name === activeTab)?.statusIds || [], [categories, activeTab]);

    const { data: apiResponse, isLoading: tendersLoading } = useTenders(
        activeTab,
        selectedStatusIds,
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

    // Cache the count for the active tab
    useEffect(() => {
        if (activeTab && totalRows > 0) {
            setTabCounts(prev => ({
                ...prev,
                [activeTab]: totalRows
            }));
        }
    }, [activeTab, totalRows]);

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
            flex: 2,
            minWidth: 250,
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
            width: 130,
            cellRenderer: (p: { value: number | null | undefined }) => formatINR(p.value ?? 0),
        },
        {
            field: "tenderFees",
            headerName: "Tender Fee",
            width: 130,
            cellRenderer: (p: { value: number | null | undefined }) => formatINR(p.value ?? 0),
        },
        {
            field: "emd",
            headerName: "EMD",
            width: 130,
            cellRenderer: (p: { value: number | null | undefined }) => formatINR(p.value ?? 0),
        },
        {
            field: "dueDate",
            headerName: "Due Date",
            width: 150,
            cellRenderer: (params: { value: string | Date }) => {
                return params.value ? formatDateTime(params.value) : "-";
            },
        },
        {
            field: "statusName",
            headerName: "Status",
            width: 150,
            cellRenderer: (params: any) => {
                return params.value ? <b>{params.value}</b> : <span className="text-gray-400">—</span>;
            },
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(tenderActions),
            pinned: "right",
            width: 25,
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
                    onValueChange={setActiveTab}
                    className="flex flex-col w-full"
                >
                    <div className="flex-none m-auto">
                        <TabsList>
                            {categories.map(category => {
                                return (
                                    <TabsTrigger
                                        key={category.name}
                                        value={category.name}
                                        className="data-[state=active]:shadow-md flex items-center gap-1"
                                    >
                                        <span className="font-semibold text-sm">{category.label}</span>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    <div className="flex-1 min-h-0">
                        {categories.map(category => (
                            <TabsContent
                                key={category.name}
                                value={category.name}
                                className="m-0 data-[state=inactive]:hidden"
                            >
                                {activeTab === category.name && (
                                    <DataTable
                                        data={tenders}
                                        columnDefs={colDefs}
                                        loading={tendersLoading}
                                        manualPagination={true}
                                        rowCount={totalRows}
                                        paginationState={pagination}
                                        onPaginationChange={setPagination}
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
