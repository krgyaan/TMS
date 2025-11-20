import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useState, useMemo, useEffect } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { NavLink, useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useDeleteTender, useTenders } from '@/hooks/api/useTenders';
import { useStatuses } from '@/hooks/api/useStatuses';
import type { TenderInfoWithNames, TenderWithRelations } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, FilePlus, Pencil, Plus, Trash } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';

const TendersPage = () => {
    const { data: statuses, isLoading: statusesLoading, error: statusesError } = useStatuses();
    const [activeTab, setActiveTab] = useState<string>('');

    const TC = {
        'prep': 'Under Preperation',
        'dnb': 'Did Not BId',
        'bid': 'Bid Submitted',
        'won': 'Won',
        'lost': 'Lost',
        'unallocated': 'Unallocated'
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

        categoriesArray.push({ name: 'unallocated', label: 'Unallocated', statusIds: [] });
        return categoriesArray;
    }, [statuses]);

    useEffect(() => {
        if (categories.length > 0 && !activeTab) {
            setActiveTab(categories[0].name);
        }
    }, [categories, activeTab]);

    const selectedStatusIds = useMemo(
        () => categories.find(c => c.name === activeTab)?.statusIds || [],
        [categories, activeTab]
    );

    const { data: tenders, isLoading: tendersLoading, error: tendersError, refetch } =
        useTenders(activeTab, selectedStatusIds);

    const deleteTender = useDeleteTender();
    const navigate = useNavigate();

    const tenderActions: ActionItem<TenderInfoWithNames>[] = [
        {
            label: 'Fill Info Sheet',
            onClick: (row: TenderWithRelations) => row.infoSheet ? navigate(paths.tendering.infoSheetEdit(row.id)) : navigate(paths.tendering.infoSheetCreate(row.id)),
            icon: <FilePlus className="h-4 w-4" />,
        },
        {
            label: 'View',
            onClick: (row: TenderInfoWithNames) => navigate(paths.tendering.tenderView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: 'Edit',
            onClick: (row: TenderInfoWithNames) => navigate(paths.tendering.tenderEdit(row.id)),
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete tender "${row.tenderName}"?`)) {
                    try {
                        await deleteTender.mutateAsync(row.id);
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
            icon: <Trash className='h-4 w-4' />
        },
    ];

    const [colDefs] = useState<ColDef<TenderInfoWithNames>[]>([
        {
            field: 'tenderNo',
            headerName: 'Tender No',
            width: 200,
        },
        {
            field: 'tenderName',
            headerName: 'Tender Name',
            flex: 2,
        },
        {
            field: 'organizationAcronym',
            headerName: 'Org.',
            width: 100,
            cellRenderer: (params: any) => {
                return <span title={params.data.organizationName}>{params.value || '-'}</span>;
            },
        },
        {
            field: 'itemName',
            headerName: 'Item',
            width: 150,
            cellRenderer: (params: any) => {
                return params.value || <span className="text-gray-400">-</span>;
            },
        },
        {
            field: 'teamMemberName',
            headerName: 'Member',
            width: 150,
            cellRenderer: (params: any) => {
                const { value, data } = params;
                return (
                    <span title={data?.teamMemberUsername}>
                        {value ? value : <b className='text-gray-400'>Unassigned</b>}
                    </span>
                );
            },
        },
        {
            field: 'gstValues',
            headerName: 'Tender Value',
            width: 130,
            cellRenderer: (p: { value: number | string | null | undefined }) =>
                p.value !== null && p.value !== undefined
                    ? formatINR(p.value)
                    : <span className="text-gray-400">—</span>,
        },
        {
            field: 'tenderFees',
            headerName: 'Tender Fee',
            width: 130,
            cellRenderer: (p: { value: number | string | null | undefined }) =>
                p.value !== null && p.value !== undefined
                    ? formatINR(p.value)
                    : <span className="text-gray-400">—</span>,
        },
        {
            field: 'emd',
            headerName: 'EMD',
            width: 130,
            cellRenderer: (p: { value: number | string | null | undefined }) =>
                p.value !== null && p.value !== undefined
                    ? formatINR(p.value)
                    : <span className="text-gray-400">—</span>,
        },
        {
            field: 'dueDate',
            headerName: 'Due Date',
            width: 150,
            cellRenderer: (params: { value: string | Date }) => {
                return params.value ? formatDateTime(params.value) : '-';
            },
        },
        {
            field: 'statusName',
            headerName: 'Status',
            width: 150,
            cellRenderer: (params: any) => {
                return params.value ? (
                    <b>{params.value}</b>
                ) : (
                    <span className="text-gray-400">—</span>
                );
            },
        },
        {
            headerName: 'Actions',
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(tenderActions),
            pinned: 'right',
            width: 25,
        },
    ]);

    if (statusesLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-12 w-full mb-4" />
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (statusesError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tenders</CardTitle>
                    <CardDescription>Manage all tenders</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading categories: {statusesError.message}
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="ml-4">
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (tendersError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tenders</CardTitle>
                    <CardDescription>Manage all tenders</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading tenders: {tendersError.message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (categories.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tenders</CardTitle>
                    <CardDescription>No categories found</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No tender categories have been configured. Please add statuses with tender categories first.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tenders</CardTitle>
                <CardDescription>All tenders categorized by status</CardDescription>
                <CardAction>
                    <Button variant="default" asChild>
                        <NavLink to={paths.tendering.tenderCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Tender
                        </NavLink>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
                    <TabsList className="m-auto">
                        {categories.map((category) => (
                            <TabsTrigger key={category.name} value={category.name}>
                                {category.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {categories.map((category) => (
                        <TabsContent key={category.name} value={category.name} className="h-screen mt-0">
                            {activeTab === category.name ? (
                                <DataTable
                                    key={`${activeTab}-tenders`}
                                    data={tenders ?? []}
                                    columnDefs={colDefs}
                                    loading={tendersLoading}
                                    gridOptions={{
                                        defaultColDef: { editable: true, filter: true, sortable: true, resizable: true },
                                        pagination: true,
                                        overlayNoRowsTemplate: '<span style="padding: 10px;">No data found</span>',
                                    }}
                                    enablePagination
                                    height="auto"
                                />
                            ) : null}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default TendersPage;
