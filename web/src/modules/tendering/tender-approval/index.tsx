import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useAllTenders } from '@/hooks/api/useTenderApprovals';
import type { TenderApproval, TenderApprovalRow } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { toast } from 'sonner';

const TABS_NAMES = {
    '0': 'Pending',
    '1': 'Approved',
    '2': 'Rejected',
    '3': 'Incomplete',
} as const;

type TabConfig = {
    key: '0' | '1' | '2' | '3';
    name: string;
    count: number;
    data: TenderApprovalRow[];
};

const TenderApproval = () => {
    const [activeTab, setActiveTab] = useState<'0' | '1' | '2' | '3'>('0');
    const navigate = useNavigate();

    const {
        data: tabsData,
        isLoading: loading,
        error
    } = useAllTenders();

    const approvalActions: ActionItem<any>[] = [
        {
            label: 'Approve',
            onClick: (row: any) => {
                const tenderId = row.tenderId || row.id;
                if (!tenderId) {
                    toast.error('Unable to approve: Tender ID is missing');
                    return;
                }
                navigate(paths.tendering.tenderApprovalCreate(tenderId));
            },
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'View',
            onClick: (row: any) => {
                const tenderId = row.tenderId || row.id;
                if (!tenderId) {
                    toast.error('Unable to view: Tender ID is missing');
                    return;
                }
                navigate(paths.tendering.tenderApprovalView(tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const tabsConfig = useMemo<TabConfig[]>(() => {
        if (!tabsData || typeof tabsData !== 'object') return [];

        return Object.entries(TABS_NAMES).map(([key, name]) => {
            // Access tabsData as object, not array
            const tabData = (tabsData as Record<string, TenderApprovalRow[]>)[name] || [];
            return {
                key: key as '0' | '1' | '2' | '3',
                name,
                count: tabData.length,
                data: tabData
            };
        });
    }, [tabsData]);

    const colDefs = useMemo<ColDef<TenderApprovalRow>[]>(() => [
        {
            field: 'tenderNo',
            headerName: 'Tender No',
            flex: 1,
            minWidth: 120,
            sortable: true,
            filter: true,
        },
        {
            field: 'tenderName',
            headerName: 'Tender Name',
            flex: 2,
            minWidth: 200,
            sortable: true,
            filter: true,
        },
        {
            field: 'teamMemberName',
            headerName: 'Member',
            flex: 1.5,
            minWidth: 150,
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            headerName: 'Due Date/Time',
            flex: 1.5,
            minWidth: 150,
            valueGetter: (params: any) => {
                if (!params.data?.dueDate) return '—';
                return formatDateTime(params.data.dueDate);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'gstValues',
            headerName: 'Tender Value',
            flex: 1,
            minWidth: 130,
            valueGetter: (params: any) => {
                const value = params.data?.gstValues;
                if (value === null || value === undefined) return '—';
                return new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(value);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'itemName',
            headerName: 'Item',
            flex: 0.8,
            minWidth: 80,
            valueGetter: (params: any) => params.data?.itemName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            headerName: 'Status',
            flex: 1,
            minWidth: 120,
            cellRenderer: (params: any) => {
                const status = params.data?.statusName;
                if (!status) return '—';
                return (
                    <Badge variant={status ? 'default' : 'secondary'}>
                        {status}
                    </Badge>
                );
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'tlStatus',
            headerName: 'TL Status',
            flex: 1,
            minWidth: 120,
            cellRenderer: (params: any) => {
                const tlStatus = params.data?.tlStatus;
                const statusName = TABS_NAMES[tlStatus as keyof typeof TABS_NAMES];
                const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                    '0': 'outline',
                    '1': 'default',
                    '2': 'destructive',
                    '3': 'secondary',
                };
                const badgeVariant = variants[tlStatus as string] || 'secondary';
                const isGreen = tlStatus === '1';
                return (
                    <Badge
                        variant={badgeVariant}
                        className={isGreen ? 'bg-green-500 text-white' : ''}
                    >
                        {statusName || '—'}
                    </Badge>
                );
            },
            sortable: true,
            filter: true,
        },
        {
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(approvalActions),
            sortable: false,
            pinned: 'right',
            width: 120,
        },
    ], [approvalActions]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-24 flex-1" />
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
                    <CardTitle>Tender Approvals</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load tender approvals. Please try again later.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Tender Approvals</CardTitle>
                        <CardDescription className="mt-2">
                            Review and approve tender decisions.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as '0' | '1' | '2' | '3')}>
                    <TabsList className="m-auto">
                        {tabsConfig.map((tab) => (
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
                        ))}
                    </TabsList>

                    {tabsConfig.map((tab) => (
                        <TabsContent
                            key={tab.key}
                            value={tab.key}
                            className="px-0"
                        >
                            {tab.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                    {/* <Loader2 className="h-12 w-12 animate-spin mb-4" /> */}
                                    <p className="text-lg font-medium">No {tab.name.toLowerCase()} tenders</p>
                                </div>
                            ) : (
                                <DataTable
                                    data={tab.data}
                                    columnDefs={colDefs as ColDef<any>[]}
                                    loading={false}
                                    gridOptions={{
                                        defaultColDef: {
                                            editable: false,
                                            filter: true,
                                            sortable: true,
                                            resizable: true
                                        },
                                        pagination: true,
                                        paginationPageSize: 50,
                                        overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No tenders found</span>',
                                    }}
                                    enablePagination
                                    height="auto"
                                />
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default TenderApproval;
