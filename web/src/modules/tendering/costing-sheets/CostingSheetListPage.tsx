import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { useMemo, useState, useEffect, useCallback } from "react";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, Edit, Send, FileX2, ExternalLink, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import type { CostingSheetDashboardRowWithTimer, CostingSheetTab } from "@/modules/tendering/costing-sheets/helpers/costingSheet.types";
import { tenderNameCol } from "@/components/data-grid/columns";
import { useCostingSheets, useCostingSheetsCounts, useCheckDriveScopes, useCreateCostingSheet, useCreateCostingSheetWithName } from "@/hooks/api/useCostingSheets";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axios";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { QuickFilter } from "@/components/ui/quick-filter";
import { TableSortFilter } from "@/components/ui/table-sort-filter";

const CostingSheets = () => {
    const [activeTab, setActiveTab] = useState<CostingSheetTab>('pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();

    const [connectDriveOpen, setConnectDriveOpen] = useState(false);
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState<{
        tenderId: number;
        existingUrl?: string;
        suggestedName?: string;
    } | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isConnectingDrive, setIsConnectingDrive] = useState(false);

    const { data: driveScopes } = useCheckDriveScopes();
    const createSheetMutation = useCreateCostingSheet();
    const createSheetWithNameMutation = useCreateCostingSheetWithName();

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

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

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const { data: apiResponse, isLoading: loading, error } = useCostingSheets(
        activeTab,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const { data: counts } = useCostingSheetsCounts();

    const costingSheetsData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const handleCreateCosting = useCallback(async (row: CostingSheetDashboardRowWithTimer) => {
        // Check if user has Drive scopes
        if (!driveScopes?.hasScopes) {
            setConnectDriveOpen(true);
            return;
        }

        setIsCreating(true);

        try {
            const result = await createSheetMutation.mutateAsync(row.tenderId);

            if (result.success && result.sheetUrl) {
                // Open the sheet in a new tab
                window.open(result.sheetUrl, '_blank');
            } else if (result.isDuplicate) {
                // Show duplicate dialog
                setDuplicateInfo({
                    tenderId: row.tenderId,
                    existingUrl: result.existingSheetUrl,
                    suggestedName: result.suggestedName,
                });
                setDuplicateDialogOpen(true);
            } else if (result.message) {
                toast.error(result.message);
            }
        } catch (error) {
            // Error handled by mutation
        } finally {
            setIsCreating(false);
        }
    }, [driveScopes, createSheetMutation]);

    const handleCreateWithSuggestedName = useCallback(async () => {
        if (!duplicateInfo?.suggestedName) return;

        setIsCreating(true);
        setDuplicateDialogOpen(false);

        try {
            const result = await createSheetWithNameMutation.mutateAsync({
                tenderId: duplicateInfo.tenderId,
                customName: duplicateInfo.suggestedName,
            });

            if (result.success && result.sheetUrl) {
                window.open(result.sheetUrl, '_blank');
            }
        } catch (error) {
            // Error handled by mutation
        } finally {
            setIsCreating(false);
            setDuplicateInfo(null);
        }
    }, [duplicateInfo, createSheetWithNameMutation]);

    const handleConnectDrive = useCallback(async () => {
        if (isConnectingDrive) return;

        setIsConnectingDrive(true);
        try {
            // Fetch the OAuth URL from the API
            const response = await axiosInstance.get('/integrations/google/drive-auth-url');
            const data = response.data;

            // Check if user already has scopes
            if (data.hasScopes) {
                toast.success('Google Drive is already connected');
                setConnectDriveOpen(false);
                return;
            }

            // Extract the OAuth URL from the response
            if (data.url && typeof data.url === 'string') {
                // Redirect to Google OAuth
                window.location.href = data.url;
            } else {
                throw new Error('Invalid response from server: missing OAuth URL');
            }
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message ||
                error?.message ||
                'Failed to connect Google Drive. Please try again.';
            toast.error(errorMessage);
            console.error('Failed to get Google Drive auth URL:', error);
        } finally {
            setIsConnectingDrive(false);
        }
    }, [isConnectingDrive]);

    const costingSheetActions: ActionItem<CostingSheetDashboardRowWithTimer>[] = useMemo(() => [
        {
            label: 'Create Costing',
            onClick: handleCreateCosting,
            icon: <Plus className="h-4 w-4" />,
            visible: (row) => !row.googleSheetUrl,
            disabled: isCreating,
        },
        {
            label: 'Submit Costing',
            onClick: (row: CostingSheetDashboardRowWithTimer) => {
                navigate(paths.tendering.costingSheetSubmit(row.tenderId));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.googleSheetUrl ? true : false,
        },
        {
            label: 'Edit Costing',
            onClick: (row: CostingSheetDashboardRowWithTimer) => {
                navigate(paths.tendering.costingSheetEdit(row.tenderId));
            },
            icon: <Edit className="h-4 w-4" />,
            visible: (row) => row.costingStatus === 'Submitted',
        },
        {
            label: 'Re-submit Costing',
            onClick: (row: CostingSheetDashboardRowWithTimer) => {
                navigate(paths.tendering.costingSheetResubmit(row.tenderId));
            },
            icon: <Send className="h-4 w-4" />,
            visible: (row) => row.costingStatus === 'Rejected/Redo',
        },
        {
            label: 'View Costing',
            onClick: (row: CostingSheetDashboardRowWithTimer) => {
                navigate(paths.tendering.costingSheetView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ], [navigate, handleCreateCosting, isCreating]);

    const tabsConfig = useMemo(() => {
        return [
            {
                key: 'pending' as CostingSheetTab,
                name: 'Costing Sheet Pending',
                count: counts?.pending || 0,
            },
            {
                key: 'submitted' as CostingSheetTab,
                name: 'Costing Sheet Submitted',
                count: counts?.submitted || 0,
            },
            {
                key: 'tender-dnb' as CostingSheetTab,
                name: 'Tender DNB',
                count: counts?.['tender-dnb'] || 0,
            },
        ];
    }, [counts]);

    const colDefs = useMemo<ColDef<CostingSheetDashboardRowWithTimer>[]>(() => [
        tenderNameCol<CostingSheetDashboardRowWithTimer>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 200,
        }),
        {
            field: 'teamMemberName',
            colId: 'teamMemberName',
            headerName: 'Member',
            width: 120,
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            colId: 'dueDate',
            headerName: 'Due Date',
            width: 140,
            valueGetter: (params: any) => params.data?.dueDate ? formatDateTime(params.data.dueDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'emdAmount',
            colId: 'emdAmount',
            headerName: 'EMD',
            width: 100,
            valueGetter: (params: any) => {
                const value = params.data?.emdAmount;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            colId: 'statusName',
            headerName: 'Tender Status',
            width: 150,
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.data?.statusName;
                if (!status) return '—';
                return status;
            },
        },
        {
            field: 'costingStatus',
            colId: 'costingStatus',
            headerName: 'Status',
            width: 120,
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.data?.costingStatus;
                if (!status) return '—';
                return <Badge variant={status === 'Submitted' ? 'success' : status === 'Rejected/Redo' ? 'destructive' : 'secondary'}>{status}</Badge>;
            },
        },
        {
            field: 'submittedFinalPrice',
            colId: 'submittedFinalPrice',
            headerName: 'Final Price',
            width: 130,
            valueGetter: (params: any) => {
                const value = params.data?.submittedFinalPrice;
                if (!value) return '—';
                return formatINR(parseFloat(value));
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'googleSheetUrl',
            headerName: 'Sheet',
            width: 80,
            sortable: false,
            filter: false,
            cellRenderer: (params: any) => {
                const url = params.value;
                if (!url) return '—';
                return (
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                );
            },
        },
        {
            field: 'timer',
            headerName: 'Timer',
            width: 110,
            cellRenderer: (params: any) => {
                const { data } = params;
                const timer = data?.timer;

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
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(costingSheetActions),
            sortable: false,
            pinned: 'right',
            width: 80,
        },
    ], [costingSheetActions]);

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
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-32" />
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
                    <CardTitle>Costing Sheets</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load costing sheets. Please try again later.
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
                        <CardTitle>Costing Sheets</CardTitle>
                        <CardDescription className="mt-2">
                            Manage costing sheets for approved tenders.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CostingSheetTab)}>
                    <TabsList className="m-auto mb-4">
                        {tabsConfig.map((tab) => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="data-[state=active]:shadow-md flex items-center gap-1"
                            >
                                <span className="font-semibold text-sm">{tab.name}</span>
                                {tab.count > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {tab.count}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Search Row: Quick Filters, Search Bar, Sort Filter */}
                    <div className="flex items-center gap-4 px-6 pb-4">
                        {/* Quick Filters (Left) - Optional, can be added per page */}
                        
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
                        
                        {/* Sort Filter Button (Right) */}
                        <TableSortFilter
                            columnDefs={colDefs as ColDef<any>[]}
                            currentSort={sortModel[0]}
                            onSortChange={(sort) => {
                                setSortModel(sort ? [sort] : []);
                                setPagination(p => ({ ...p, pageIndex: 0 }));
                            }}
                        />
                    </div>

                    {tabsConfig.map((tab) => (
                        <TabsContent
                            key={tab.key}
                            value={tab.key}
                            className="px-0 m-0 data-[state=inactive]:hidden"
                        >
                            {activeTab === tab.key && (
                                <>
                                    {costingSheetsData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">No {tab.name.toLowerCase()} costing sheets</p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'pending' && 'Tenders requiring costing submission will appear here'}
                                                {tab.key === 'submitted' && 'Submitted costing sheets will be shown here'}
                                                {tab.key === 'tender-dnb' && 'Tender DNB costing sheets will appear here'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={costingSheetsData}
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
                                                    resizable: true
                                                },
                                                onSortChanged: handleSortChanged,
                                                overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No costing sheets found</span>',
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>

            {/* Connect Drive Dialog */}
            <Dialog open={connectDriveOpen} onOpenChange={setConnectDriveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect Google Drive</DialogTitle>
                        <DialogDescription>
                            To create costing sheets, you need to grant access to Google Drive and Sheets.
                            This is a one-time authorization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Required permissions:
                        </p>
                        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                            <li>Create and edit files in Google Drive</li>
                            <li>Create and edit Google Sheets</li>
                        </ul>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConnectDriveOpen(false)}
                            disabled={isConnectingDrive}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleConnectDrive} disabled={isConnectingDrive}>
                            {isConnectingDrive ? 'Connecting...' : 'Connect Google Drive'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duplicate Sheet Dialog */}
            <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Duplicate Sheet Name</DialogTitle>
                        <DialogDescription>
                            A costing sheet with this name already exists in the folder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {duplicateInfo?.existingUrl && (
                            <div>
                                <p className="text-sm font-medium">Existing sheet:</p>
                                <a
                                    href={duplicateInfo.existingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                    View existing sheet
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        )}
                        {duplicateInfo?.suggestedName && (
                            <div>
                                <p className="text-sm font-medium">Suggested name:</p>
                                <p className="text-sm text-muted-foreground">
                                    {duplicateInfo.suggestedName}
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDuplicateDialogOpen(false);
                                setDuplicateInfo(null);
                            }}
                        >
                            Cancel
                        </Button>
                        {duplicateInfo?.suggestedName && (
                            <Button onClick={handleCreateWithSuggestedName} disabled={isCreating}>
                                {isCreating ? 'Creating...' : `Create as "${duplicateInfo.suggestedName}"`}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default CostingSheets;
