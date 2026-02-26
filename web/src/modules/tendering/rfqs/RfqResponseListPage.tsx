import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback } from 'react';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ClipboardList, Eye, FileX2, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRfqResponses, useRfq, useAllRfqResponses, useRfqVendors } from '@/hooks/api/useRfqs';
import { paths } from '@/app/routes/paths';
import { QuickFilter } from '@/components/ui/quick-filter';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getRfqResponseListColumnDefs } from './helpers/rfqResponseListColDefs';
import type { RfqResponseListItem } from './helpers/rfq.types';

export default function RfqResponseListPage() {
    const { rfqId } = useParams<{ rfqId?: string }>();
    const navigate = useNavigate();
    const rfqIdNum = rfqId ? Number(rfqId) : null;
    const isGlobalList = rfqIdNum == null;

    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);

    const { data: responsesByRfq = [], isLoading: loadingByRfq, error: errorByRfq } = useRfqResponses(rfqIdNum);
    const { data: allResponses = [], isLoading: loadingAll, error: errorAll } = useAllRfqResponses();
    const { data: rfq, isLoading: rfqLoading } = useRfq(rfqIdNum);
    const { data: rfqVendors } = useRfqVendors(rfq?.requestedVendor || undefined);

    const responses = isGlobalList ? allResponses : responsesByRfq;
    const isLoading = isGlobalList ? loadingAll : (loadingByRfq || rfqLoading);
    const error = isGlobalList ? errorAll : errorByRfq;

    const filteredResponses = useMemo(() => {
        let result = responses;
        if (search.trim()) {
            const s = search.trim().toLowerCase();
            result = responses.filter(
                (row) =>
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

    const colDefs = useMemo(
        () => getRfqResponseListColumnDefs(responseActions),
        [responseActions]
    );

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
                        <AlertDescription>Failed to load responses. Please try again later.</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const title = isGlobalList
        ? 'All RFQ Responses'
        : rfq?.tenderName
            ? `Responses: ${rfq.tenderName}`
            : 'RFQ Responses';
    const description = isGlobalList
        ? 'All responses recorded across RFQs.'
        : 'Responses recorded for this RFQ.';
    const tabLabel = isGlobalList ? 'All Responses' : 'Responses';

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
                                Back to RFQs
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => navigate(paths.tendering.rfqsResponses)}>
                                <List className="h-4 w-4 mr-2" />
                                View All Responses
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
                <Tabs value="responses" onValueChange={() => { }}>
                    <TabsList className="m-auto mb-4">
                        <TabsTrigger value="responses" className="data-[state=active]:shadow-md flex items-center gap-1">
                            <span className="font-semibold text-sm">{tabLabel}</span>
                            <Badge variant="secondary" className="text-xs">
                                {filteredResponses.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

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
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-8 w-64"
                                    />
                                </div>
                            </div>
                        </div>

                        {filteredResponses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <FileX2 className="h-12 w-12 mb-4" />
                                <p className="text-lg font-medium">No responses yet</p>
                                <p className="text-sm mt-2">
                                    {isGlobalList
                                        ? 'Responses will appear here when recorded for any RFQ.'
                                        : 'Record a receipt to add the first response.'}
                                </p>
                                {!isGlobalList && rfqIdNum && (
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
                                data={paginatedResponses}
                                columnDefs={colDefs as ColDef<RfqResponseListItem>[]}
                                loading={isLoading}
                                manualPagination={true}
                                rowCount={filteredResponses.length}
                                paginationState={pagination}
                                onPaginationChange={setPagination}
                                onPageSizeChange={handlePageSizeChange}
                                showTotalCount={true}
                                showLengthChange={true}
                                gridOptions={{
                                    defaultColDef: {
                                        editable: false,
                                        filter: true,
                                        sortable: true,
                                        resizable: true,
                                    },
                                    onSortChanged: handleSortChanged,
                                    initialState: sortModel.length
                                        ? { sort: { sortModel } }
                                        : undefined,
                                    overlayNoRowsTemplate:
                                        '<span style="padding: 10px; text-align: center;">No responses found</span>',
                                }}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
