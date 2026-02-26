import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback, useEffect } from 'react';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ClipboardList, Eye, FileX2, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRfqResponses } from '@/hooks/api/useRfqResponses';
import { useRfq, useRfqVendors, useRfqsDashboard, useRfqsDashboardCounts } from '@/hooks/api/useRfqs';
import { paths } from '@/app/routes/paths';
import { QuickFilter } from '@/components/ui/quick-filter';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dateCol, tenderNameCol } from '@/components/data-grid';
import { TenderTimerDisplay } from '@/components/TenderTimerDisplay';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import { getRfqResponseListColumnDefs } from './helpers/rfqResponseListColDefs';
import type { RfqResponseListItem } from './helpers/rfqResponse.types';
import type { RfqDashboardRowWithTimer } from '@/modules/tendering/rfqs/helpers/rfq.types';

export default function RfqResponseListPage() {
    const { rfqId } = useParams<{ rfqId?: string }>();
    const navigate = useNavigate();
    const rfqIdNum = rfqId ? Number(rfqId) : null;
    const isGlobalList = rfqIdNum == null;

    const [activeTab, setActiveTab] = useState<'sent' | 'responses'>('sent');
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [activeTab, search]);

    // Data for "Responses" tab
    const { data: responsesByRfq = [], isLoading: loadingByRfq, error: errorByRfq } = useRfqResponses(rfqIdNum);

    // Data for "RFQ Sent" or "Responses Recorded" tab (Dashboard view)
    const { data: rfqDashboard, isLoading: loadingDashboard } = useRfqsDashboard({
        tab: activeTab === 'sent' ? 'sent' : 'responses',
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: search || undefined,
    });
    const { data: rfqCounts } = useRfqsDashboardCounts();

    const { data: rfq, isLoading: rfqLoading } = useRfq(rfqIdNum);
    const { data: rfqVendors } = useRfqVendors(rfq?.requestedVendor || undefined);

    const responses = responsesByRfq;
    const isLoading = isGlobalList
        ? loadingDashboard
        : (loadingByRfq || rfqLoading);
    const error = isGlobalList ? null : errorByRfq;

    // Filtered Responses for "Responses" tab (client-side for simplicity if not paginated by API yet)
    const filteredResponses = useMemo(() => {
        let result = responses;
        if (search.trim()) {
            const s = search.trim().toLowerCase();
            result = responses.filter(
                (row: RfqResponseListItem) =>
                    (row.tenderName?.toLowerCase().includes(s)) ||
                    (row.tenderNo?.toLowerCase().includes(s)) ||
                    (row.vendorName?.toLowerCase().includes(s)) ||
                    (row.itemSummary?.toLowerCase().includes(s))
            );
        }
        return result;
    }, [responses, search]);

    const paginatedResponses = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return filteredResponses.slice(start, start + pagination.pageSize);
    }, [filteredResponses, pagination]);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const handleSortChanged = useCallback((event: any) => {
        const nextSortModel = event.api.getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc',
            }));
        setSortModel(nextSortModel);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    // Actions for "Responses" tab
    const responseActions = useMemo<ActionItem<RfqResponseListItem>[]>(
        () => [
            {
                label: 'View',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: RfqResponseListItem) => navigate(paths.tendering.rfqResponseView(row.id)),
            },
            {
                label: 'Record Receipt',
                icon: <ClipboardList className="h-4 w-4" />,
                onClick: (row: RfqResponseListItem) => navigate(paths.tendering.rfqsResponseNew(row.rfqId)),
            },
        ],
        [navigate]
    );

    // Actions for "RFQ Sent" tab
    const rfqSentActions = useMemo<ActionItem<RfqDashboardRowWithTimer>[]>(() => [
        {
            label: 'Record Receipt',
            icon: <ClipboardList className="h-4 w-4" />,
            onClick: (row: RfqDashboardRowWithTimer) => {
                if (row.rfqId) navigate(paths.tendering.rfqsResponseNew(row.rfqId));
            },
        },
        {
            label: 'View RFQ',
            icon: <Eye className="h-4 w-4" />,
            onClick: (row: RfqDashboardRowWithTimer) => navigate(paths.tendering.rfqsView(row.tenderId)),
        },
    ], [navigate]);

    const responseColDefs = useMemo(
        () => getRfqResponseListColumnDefs(responseActions),
        [responseActions]
    );

    const rfqSentColDefs = useMemo<ColDef<RfqDashboardRowWithTimer>[]>(() => [
        tenderNameCol<RfqDashboardRowWithTimer>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 250,
            colId: 'tenderNo',
            sortable: true,
        }),
        {
            field: 'teamMemberName',
            headerName: 'Team Member',
            width: 150,
            colId: 'teamMemberName',
            valueGetter: (params: any) => params.data?.teamMemberName ? params.data.teamMemberName : '—',
            sortable: true,
            filter: true,
        },
        dateCol<RfqDashboardRowWithTimer>('dueDate', {
            headerName: 'Due Date',
            width: 150,
            colId: 'dueDate',
        }),
        {
            field: 'rfqCount',
            headerName: 'Sent count',
            width: 120,
            colId: 'rfqCount',
            cellRenderer: (params: any) => {
                const count = params.data?.rfqCount ?? 0;
                return <Badge variant="outline">{count} sent</Badge>;
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'responseCount',
            headerName: 'Resp Recorded',
            width: 130,
            colId: 'responseCount',
            cellRenderer: (params: any) => {
                const count = params.data?.responseCount ?? 0;
                return (
                    <Badge variant={count > 0 ? 'success' : 'secondary'}>
                        {count} Responses
                    </Badge>
                );
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'vendorOrganizationNames',
            headerName: 'Vendor',
            width: 150,
            colId: 'vendorOrganizationNames',
            cellRenderer: (params: any) => {
                const names = params.data?.vendorOrganizationNames;
                if (!names) return <p>—</p>;
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="secondary">
                                {names.split(',').length} vendors
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <ul className="list-disc list-inside font-medium text-xs">
                                {names.split(',').map((name: string) => (
                                    <li key={name}>{name}</li>
                                ))}
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                );
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'timer',
            headerName: 'Timer',
            width: 150,
            cellRenderer: (params: any) => {
                const timer = params.data?.timer;
                if (!timer) return <TenderTimerDisplay remainingSeconds={0} status="NOT_STARTED" />;
                return <TenderTimerDisplay remainingSeconds={timer.remainingSeconds} status={timer.status} />;
            },
        },
        {
            headerName: '',
            filter: false,
            cellRenderer: createActionColumnRenderer(rfqSentActions),
            sortable: false,
            pinned: 'right',
            width: 57,
        },
    ], [rfqSentActions]);

    if (rfqId != null && rfqId !== '' && (Number.isNaN(rfqIdNum!) || (rfqIdNum ?? 0) < 1)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid RFQ ID.</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
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
                    <CardTitle>RFQ Responses</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Failed to load data. Please try again later.</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const title = isGlobalList
        ? 'RFQ Response Dashboard'
        : rfq?.tenderName
            ? `Responses: ${rfq.tenderName}`
            : 'RFQ Responses';
    const description = isGlobalList
        ? 'Manage sent RFQs and track vendor responses.'
        : 'Responses recorded for this RFQ.';

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription className="mt-2">{description}</CardDescription>
                    </div>
                    <CardAction>
                        {isGlobalList ? (
                            <Button variant="outline" onClick={() => navigate(paths.tendering.rfqs)}>
                                Back to RFQ Management
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => navigate(paths.tendering.rfqsResponses)}>
                                <List className="h-4 w-4 mr-2" />
                                View All Dashboard
                            </Button>
                        )}
                    </CardAction>
                </div>

                {!isGlobalList && rfq && (
                    <div className="mt-4 px-6 pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm bg-muted/20 p-4 rounded-lg border border-dashed">
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Tender Number</span>
                                <span className="font-semibold text-primary">{rfq.tenderNo}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Tender Name</span>
                                <span className="font-semibold">{rfq.tenderName}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Item Name</span>
                                <span className="font-semibold italic">{rfq.itemName}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase font-bold mb-1">Vendors</span>
                                <div className="mt-1">
                                    {(rfqVendors && rfqVendors.length > 0) ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="secondary" className="cursor-default">
                                                    {rfqVendors.length} vendors
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <ul className="list-disc list-inside font-medium">
                                                    {rfqVendors.map(v => (
                                                        <li key={v.id}>{v.name}</li>
                                                    ))}
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <span className="text-muted-foreground text-xs italic">No vendors selected</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                    <TabsList className="m-auto mb-4">
                        <TabsTrigger value="sent" className="data-[state=active]:shadow-md flex items-center gap-1">
                            <span className="font-semibold text-sm">RFQ Sent</span>
                            <Badge variant="secondary" className="text-xs">
                                {isGlobalList ? (rfqCounts?.sent ?? 0) : '-'}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="responses" className="data-[state=active]:shadow-md flex items-center gap-1">
                            <span className="font-semibold text-sm">Responses Recorded</span>
                            <Badge variant="secondary" className="text-xs">
                                {isGlobalList ? (rfqCounts?.responses ?? 0) : filteredResponses.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="sent" className="px-0 m-0">
                        <div className="flex items-center gap-4 px-6 pb-4">
                            <QuickFilter
                                options={[
                                    { label: 'This Week', value: 'this-week' },
                                    { label: 'This Month', value: 'this-month' },
                                    { label: 'This Year', value: 'this-year' },
                                ]}
                                value={search}
                                onChange={(value: string) => setSearch(value)}
                            />
                            <div className="flex-1 flex justify-end">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search RFQs..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-8 w-64"
                                    />
                                </div>
                            </div>
                        </div>

                        {(isGlobalList && (!rfqDashboard?.data || rfqDashboard.data.length === 0)) ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <FileX2 className="h-12 w-12 mb-4" />
                                <p className="text-lg font-medium">No sent RFQs found</p>
                            </div>
                        ) : (
                            <DataTable
                                data={isGlobalList ? (rfqDashboard?.data ?? []) : []}
                                columnDefs={rfqSentColDefs as ColDef<any>[]}
                                loading={isLoading}
                                manualPagination={isGlobalList}
                                rowCount={isGlobalList ? (rfqDashboard?.meta?.total ?? 0) : 0}
                                paginationState={pagination}
                                onPaginationChange={setPagination}
                                onPageSizeChange={handlePageSizeChange}
                                showTotalCount={true}
                                showLengthChange={true}
                                gridOptions={{
                                    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
                                    onSortChanged: handleSortChanged,
                                    initialState: sortModel.length ? { sort: { sortModel } } : undefined,
                                    overlayNoRowsTemplate: '<span style="padding: 10px;">No sent RFQs found</span>',
                                }}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="responses" className="px-0 m-0">
                        <div className="flex items-center gap-4 px-6 pb-4">
                            <QuickFilter
                                options={[
                                    { label: 'This Week', value: 'this-week' },
                                    { label: 'This Month', value: 'this-month' },
                                    { label: 'This Year', value: 'this-year' },
                                ]}
                                value={search}
                                onChange={(value: string) => setSearch(value)}
                            />
                            <div className="flex-1 flex justify-end">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search responses..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-8 w-64"
                                    />
                                </div>
                            </div>
                        </div>

                        {(isGlobalList && (!rfqDashboard?.data || rfqDashboard.data.length === 0)) ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <FileX2 className="h-12 w-12 mb-4" />
                                <p className="text-lg font-medium">No responses yet</p>
                            </div>
                        ) : (!isGlobalList && filteredResponses.length === 0) ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <FileX2 className="h-12 w-12 mb-4" />
                                <p className="text-lg font-medium">No responses yet</p>
                                {rfqIdNum && (
                                    <Button
                                        className="mt-4"
                                        variant="outline"
                                        onClick={() => navigate(paths.tendering.rfqsResponseNew(rfqIdNum))}
                                    >
                                        <ClipboardList className="h-4 w-4 mr-2" />
                                        Record Receipt
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <DataTable
                                data={isGlobalList ? (rfqDashboard?.data ?? []) : paginatedResponses}
                                columnDefs={isGlobalList ? (rfqSentColDefs as ColDef<any>[]) : (responseColDefs as ColDef<RfqResponseListItem>[])}
                                loading={isLoading}
                                manualPagination={isGlobalList}
                                rowCount={isGlobalList ? (rfqCounts?.responses ?? 0) : filteredResponses.length}
                                paginationState={pagination}
                                onPaginationChange={setPagination}
                                onPageSizeChange={handlePageSizeChange}
                                showTotalCount={true}
                                showLengthChange={true}
                                gridOptions={{
                                    defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
                                    onSortChanged: handleSortChanged,
                                    overlayNoRowsTemplate: '<span style="padding: 10px;">No responses found</span>',
                                }}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
