// D:\tms\web\src\components\ui\data-table.tsx
import { useMemo, useCallback, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridOptions, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { myAgTheme } from '@/components/data-grid/theme';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    autoSizeColumns?: boolean | string[];
    showTotalCount?: boolean;
    showLengthChange?: boolean;
    pageSizeOptions?: number[];
    onPageSizeChange?: (pageSize: number) => void;
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
    autoSizeColumns,
    showTotalCount = true,
    showLengthChange = true,
    pageSizeOptions = [5, 10, 25, 50, 100],
    onPageSizeChange,
}: DataTableProps<T>) => {

    // 1. Calculate Pagination Logic
    const activePageSize = manualPagination ? (paginationState?.pageSize ?? 50) : pageSize;
    const currentPage = (paginationState?.pageIndex ?? 0) + 1;
    const totalPages = manualPagination ? Math.ceil(rowCount / activePageSize) : 0;
    const startRow = (currentPage - 1) * activePageSize + 1;
    const endRow = Math.min(currentPage * activePageSize, rowCount);

    // Generate page numbers to display (show max 5 pages around current)
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxPagesToShow = 5;
        
        if (totalPages <= maxPagesToShow) {
            // Show all pages if total is less than max
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show pages around current page
            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
            
            // Adjust if we're near the end
            if (endPage - startPage < maxPagesToShow - 1) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }
            
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push('...');
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    const handlePageSizeChange = (newSize: string) => {
        const newPageSize = parseInt(newSize, 10);
        if (onPageSizeChange) {
            onPageSizeChange(newPageSize);
        } else if (onPaginationChange && paginationState) {
            // Reset to first page when changing page size
            onPaginationChange({ ...paginationState, pageSize: newPageSize, pageIndex: 0 });
        }
    };

    const handlePageChange = (page: number) => {
        if (onPaginationChange && paginationState) {
            onPaginationChange({ ...paginationState, pageIndex: page - 1 });
        }
    };

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
        // Auto-size columns if enabled
        if (autoSizeColumns) {
            if (Array.isArray(autoSizeColumns)) {
                // Auto-size specific columns
                event.api.autoSizeColumns(autoSizeColumns);
            } else {
                // Auto-size all columns - get all column IDs
                const allColumnIds = event.api.getColumns()?.map(col => col.getColId()).filter((id): id is string => id !== null) || [];
                if (allColumnIds.length > 0) {
                    event.api.autoSizeColumns(allColumnIds);
                }
            }
        }
        if (onGridReady) onGridReady(event);
    }, [onGridReady, autoSizeColumns]);

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
                    {/* Left: Total Count */}
                    {showTotalCount && (
                        <div className="text-sm text-muted-foreground">
                            Total: <strong>{rowCount}</strong>
                        </div>
                    )}
                    
                    {/* Center: Pagination with Page Numbers */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {getPageNumbers().map((page, index) => {
                            if (page === '...') {
                                return (
                                    <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                                        ...
                                    </span>
                                );
                            }
                            const pageNum = page as number;
                            return (
                                <Button
                                    key={pageNum}
                                    variant={pageNum === currentPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(pageNum)}
                                    disabled={loading}
                                    className="h-8 min-w-8 px-2"
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || loading}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Right: Length Change */}
                    {showLengthChange && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Show per Page:</span>
                            <Select
                                value={activePageSize.toString()}
                                onValueChange={handlePageSizeChange}
                            >
                                <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={size.toString()}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DataTable;
