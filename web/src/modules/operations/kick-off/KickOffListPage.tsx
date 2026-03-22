import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileX2, Search, CheckCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWoDetails } from '@/hooks/api/useWoDetails';
import type { WoDetailsListResponseDto, WoDetailsFilters } from '@/modules/operations/types/wo.types';
import { currencyCol, dateCol } from '@/components/data-grid';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useTeamFilter } from '@/hooks/useTeamFilter';
import { WoUploadMomDialog } from '../wo-details/components/WoUploadMomDialog';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';

const KickOffListPage = () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const { teamId } = useTeamFilter();
    const navigate = useNavigate();

    // Kickoff Modals State
    const [selectedWoId, setSelectedWoId] = useState<number | null>(null);
    const [selectedKickoffId, setSelectedKickoffId] = useState<number | null>(null);
    const [isUploadMomOpen, setIsUploadMomOpen] = useState(false);

    // Reset pagination on search/team change
    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [debouncedSearch, teamId]);

    const handleSortChanged = useCallback((event: any) => {
        const sortModel = event.api
            .getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc',
            }));
        setSortModel(sortModel);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    // Build filters - strictly accepted WOs
    const filters: WoDetailsFilters = useMemo(() => {
        return {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            sortBy: sortModel[0]?.colId,
            sortOrder: sortModel[0]?.sort,
            search: debouncedSearch,
            teamId: teamId === null ? undefined : teamId,
            woAcceptance: true,
        };
    }, [pagination, sortModel, debouncedSearch, teamId]);

    // Fetch data using woDetails hook but filtered
    const { data: apiResponse, isLoading: loading, error } = useWoDetails(filters);

    const tableData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const rowActions: ActionItem<WoDetailsListResponseDto>[] = [
        {
            label: 'Initiate Kickoff',
            onClick: (row) => navigate(paths.operations.woKickOffCreatePage(row.id)),
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'View Details',
            onClick: (row) => navigate(paths.operations.woBasicDetailShowPage(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    // Column definitions
    const colDefs = useMemo<ColDef<WoDetailsListResponseDto>[]>(
        () => [
            {
                field: 'projectName',
                colId: 'projectName',
                headerName: 'Project Name',
                width: 150,
                sortable: true,
            },
            {
                field: 'woNumber',
                colId: 'woNumber',
                headerName: 'WO Number',
                width: 120,
                sortable: true,
            },
            dateCol<WoDetailsListResponseDto>('woDate', { includeTime: false }, {
                headerName: 'WO Date',
                width: 120,
                colId: 'woDate',
            }),
            currencyCol<WoDetailsListResponseDto>('woValuePreGst', {
                headerName: 'WO Value',
                width: 120,
                colId: 'woValuePreGst',
            }),
            currencyCol<WoDetailsListResponseDto>('woValueGstAmt', {
                headerName: 'GST Amount',
                width: 120,
                colId: 'woValueGstAmt',
            }),
            {
                field: 'status',
                colId: 'status',
                headerName: 'WO Status',
                width: 120,
                cellRenderer: (params: any) => {
                    return <Badge variant='outline' className="capitalize">
                        {params.value?.replaceAll('_', ' ')}
                    </Badge>
                },
            },
            {
                field: 'woAcceptanceStatus',
                colId: 'woAcceptanceStatus',
                headerName: 'Acceptance',
                width: 120,
                cellRenderer: (params: any) => {
                    return <Badge variant='outline' className="capitalize">
                        {params.value ? params.value?.replaceAll('_', ' ') : 'Pending'}
                    </Badge>
                },
            },
            {
                headerName: '',
                field: 'kickoffMeetingId',
                colId: 'kickoffMeetingId',
                width: 130,
                cellRenderer: (params: any) => {
                    if (params.data.kickoffMeetingId) {
                        return <Badge variant="default" className="bg-green-600">Scheduled</Badge>;
                    }
                    return <Badge variant="secondary">Not Scheduled</Badge>;
                }
            },
            {
                headerName: '',
                filter: false,
                cellRenderer: createActionColumnRenderer(rowActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        []
    );

    // Loading state
    if (loading && !tableData.length) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Kick-off Meetings</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load. Please try again later.
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
                        <CardTitle>Kick-off Meetings</CardTitle>
                        <CardDescription className="mt-2">
                            Manage and schedule Kick-off Meetings for Accepted Work Orders.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Search and Filters Row */}
                <div className="flex items-center gap-4 pb-4">
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search WOs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>

                {tableData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <FileX2 className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No Accepted Work Orders found</p>
                        <p className="text-sm mt-2">
                            Kick-off meetings can only be scheduled for accepted work orders.
                        </p>
                    </div>
                ) : (
                    <DataTable
                        data={tableData}
                        columnDefs={colDefs as ColDef<any>[]}
                        loading={loading}
                        manualPagination={true}
                        rowCount={totalRows}
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
                            overlayNoRowsTemplate:
                                '<span style="padding: 10px; text-align: center;">No Work Orders found</span>',
                        }}
                    />
                )}
            </CardContent>

            {/* Modals */}
            {selectedWoId && selectedKickoffId && (
                <WoUploadMomDialog
                    isOpen={isUploadMomOpen}
                    onOpenChange={setIsUploadMomOpen}
                    woDetailId={selectedWoId}
                    kickoffMeetingId={selectedKickoffId}
                />
            )}
        </Card>
    );
};

export default KickOffListPage;
