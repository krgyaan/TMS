import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Import AG Grid setup to register modules
import '../../lib/ag-grid-setup';

export interface DataTableProps<T = any> {
    /** Array of data to display in the table */
    data: T[];
    /** Column definitions for the table */
    columnDefs: ColDef<T>[];
    /** Optional grid options to override defaults */
    gridOptions?: Partial<GridOptions<T>>;
    /** Height of the table (default: 400px) */
    height?: string | number;
    /** Whether to show loading state */
    loading?: boolean;
    /** Callback when grid is ready */
    onGridReady?: (event: GridReadyEvent<T>) => void;
    /** Custom CSS class for the grid container */
    className?: string;
    /** Whether to enable pagination (default: true) */
    enablePagination?: boolean;
    /** Page size for pagination (default: 20) */
    pageSize?: number;
    /** Whether to enable sorting (default: true) */
    enableSorting?: boolean;
    /** Whether to enable filtering (default: true) */
    enableFiltering?: boolean;
    /** Whether to enable column resizing (default: true) */
    enableColumnResizing?: boolean;
    /** Whether to enable row selection (default: false) */
    enableRowSelection?: boolean;
    /** Selection type: 'single' or 'multiple' */
    selectionType?: 'single' | 'multiple';
    /** Callback when row selection changes */
    onSelectionChanged?: (selectedRows: T[]) => void;
}

const DataTable = <T extends Record<string, any>>({
    data,
    columnDefs,
    gridOptions = {},
    height = 400,
    loading = false,
    onGridReady,
    className = '',
    enablePagination = true,
    pageSize = 20,
    enableSorting = true,
    enableFiltering = true,
    enableColumnResizing = true,
    enableRowSelection = false,
    selectionType = 'single',
    onSelectionChanged,
}: DataTableProps<T>) => {
    // Default grid options
    const defaultGridOptions: GridOptions<T> = useMemo(() => ({
        // Enable pagination
        pagination: enablePagination,
        paginationPageSize: pageSize,
        paginationPageSizeSelector: [10, 20, 50, 100],

        // Enable sorting
        defaultColDef: {
            sortable: enableSorting,
            filter: enableFiltering,
            resizable: enableColumnResizing,
            flex: 1,
            minWidth: 100,
        },

        // Row selection
        rowSelection: enableRowSelection ? selectionType : undefined,
        suppressRowClickSelection: enableRowSelection,

        // Performance optimizations
        suppressColumnVirtualisation: false,
        suppressRowVirtualisation: false,

        // UI improvements
        animateRows: true,
        rowHeight: 40,
        headerHeight: 40,

        // Loading overlay
        loadingOverlayComponent: () => (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        ),

        // No rows overlay
        noRowsOverlayComponent: () => (
            <div className="flex items-center justify-center h-full text-gray-500">
                No data available
            </div>
        ),
    }), [
        enablePagination,
        pageSize,
        enableSorting,
        enableFiltering,
        enableColumnResizing,
        enableRowSelection,
        selectionType,
    ]);

    // Merge user grid options with defaults
    const finalGridOptions = useMemo(() => ({
        ...defaultGridOptions,
        ...gridOptions,
    }), [defaultGridOptions, gridOptions]);

    // Handle grid ready
    const handleGridReady = useCallback((event: GridReadyEvent<T>) => {
        if (onGridReady) {
            onGridReady(event);
        }
    }, [onGridReady]);

    // Handle selection change
    const handleSelectionChanged = useCallback((event: any) => {
        if (onSelectionChanged && enableRowSelection && event.api) {
            const selectedRows: T[] = [];
            event.api.forEachNodeAfterFilterAndSort((node: any) => {
                if (node.isSelected()) {
                    selectedRows.push(node.data);
                }
            });
            onSelectionChanged(selectedRows);
        }
    }, [onSelectionChanged, enableRowSelection]);

    return (
        <div className={`ag-theme-alpine ${className}`} style={{ height: typeof height === 'number' ? `${height}px` : height }}>
            <AgGridReact
                rowData={data}
                columnDefs={columnDefs}
                gridOptions={finalGridOptions}
                onGridReady={handleGridReady}
                onSelectionChanged={handleSelectionChanged}
                loading={loading}
            />
        </div>
    );
};

export default DataTable;
