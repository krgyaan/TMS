// D:\tms\web\src\components\ui\data-table.tsx
import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridOptions, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { myAgTheme } from '@/components/data-grid/theme';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
// import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

export interface DataTableProps<T = any> {
    data: T[];
    columnDefs: ColDef<T>[];
    gridOptions?: Partial<GridOptions<T>>;
    loading?: boolean;
    onGridReady?: (event: GridReadyEvent<T>) => void;
    className?: string;
    enablePagination?: boolean;
    pageSize?: number;
    enableSorting?: boolean;
    enableFiltering?: boolean;
    enableColumnResizing?: boolean;
    enableRowSelection?: boolean;
    selectionType?: 'single' | 'multiple';
    onSelectionChanged?: (selectedRows: T[]) => void;
    themeOverride?: any;
    manualPagination?: boolean;
    rowCount?: number;
    paginationState?: {
        pageIndex: number;
        pageSize: number;
    };
    onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
}

const DataTable = <T extends Record<string, any>>({
    data,
    columnDefs,
    gridOptions = {},
    loading = false,
    manualPagination = false,
    rowCount = 0,
    paginationState,
    onPaginationChange,
    onGridReady,
    className = '',
    enablePagination = true,
    pageSize = 50,
    enableSorting = true,
    enableFiltering = true,
    enableColumnResizing = true,
    enableRowSelection = false,
    selectionType = 'single',
    onSelectionChanged,
    themeOverride,
}: DataTableProps<T>) => {

    // 1. Calculate Pagination Logic
    const activePageSize = manualPagination ? (paginationState?.pageSize ?? 50) : pageSize;
    const currentPage = (paginationState?.pageIndex ?? 0) + 1;
    const totalPages = manualPagination ? Math.ceil(rowCount / activePageSize) : 0;
    const startRow = (currentPage - 1) * activePageSize + 1;
    const endRow = Math.min(currentPage * activePageSize, rowCount);

    // 2. Memoize Grid Options
    const defaultGridOptions: GridOptions<T> = useMemo(() => ({
        pagination: !manualPagination && enablePagination,
        paginationPageSize: activePageSize,
        suppressPaginationPanel: manualPagination,
        domLayout: 'autoHeight',
        defaultColDef: {
            sortable: enableSorting,
            filter: enableFiltering,
            resizable: enableColumnResizing,
            minWidth: 100,
            flex: 1,
        },

        rowSelection: enableRowSelection ? {
            mode: selectionType === 'multiple' ? 'multiRow' : 'singleRow',
            checkboxes: selectionType === 'multiple',
            headerCheckbox: selectionType === 'multiple',
            enableClickSelection: false,
        } as RowSelectionOptions : undefined,

        rowHeight: 40,
        headerHeight: 45,
        animateRows: true,
        noRowsOverlayComponent: () => (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
            </div>
        ),
    }), [enablePagination, activePageSize, enableSorting, enableFiltering, enableColumnResizing, enableRowSelection, selectionType, manualPagination]);

    const handleGridReady = useCallback((event: GridReadyEvent<T>) => {
        if (onGridReady) onGridReady(event);
    }, [onGridReady]);

    const handleSelectionChanged = useCallback((event: any) => {
        if (onSelectionChanged && enableRowSelection) {
            onSelectionChanged(event.api.getSelectedRows());
        }
    }, [onSelectionChanged, enableRowSelection]);

    return (
        <div className={`flex flex-col w-full h-full ${className}`}>

            {/* Grid Container: Takes remaining height */}
            <div className="relative w-full">

                {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                <div style={{ width: '100%' }}>
                    <AgGridReact
                        rowData={data}
                        columnDefs={columnDefs}
                        gridOptions={defaultGridOptions}
                        {...gridOptions}
                        pagination={!manualPagination && enablePagination}
                        suppressPaginationPanel={manualPagination}
                        onGridReady={handleGridReady}
                        onSelectionChanged={handleSelectionChanged}
                        theme={themeOverride ?? myAgTheme}
                    />
                </div>
            </div>

            {/* Pagination Footer: Fixed height at bottom */}
            {manualPagination && paginationState && onPaginationChange && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-background shrink-0">
                    <div className="text-sm text-muted-foreground">
                        {rowCount > 0 ? (
                            <>Showing <strong>{startRow}</strong> to <strong>{endRow}</strong> of <strong>{rowCount}</strong> entries</>
                        ) : (
                            "No results found"
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPaginationChange({ ...paginationState, pageIndex: paginationState.pageIndex - 1 })}
                            disabled={paginationState.pageIndex === 0 || loading}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <div className="text-sm font-medium min-w-[80px] text-center">
                            Page {currentPage} of {totalPages || 1}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPaginationChange({ ...paginationState, pageIndex: paginationState.pageIndex + 1 })}
                            disabled={currentPage >= totalPages || loading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
