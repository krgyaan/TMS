import { useState, useCallback } from 'react';
import type { ColDef, GridApi } from 'ag-grid-community';

export interface UseDataTableOptions<T> {
  /** Initial data */
  initialData?: T[];
  /** Column definitions */
  columnDefs: ColDef<T>[];
  /** Whether to enable row selection */
  enableSelection?: boolean;
  /** Selection type */
  selectionType?: 'single' | 'multiple';
  /** Callback when selection changes */
  onSelectionChange?: (selectedRows: T[]) => void;
}

export interface UseDataTableReturn<T> {
  /** Current data */
  data: T[];
  /** Set data */
  setData: (data: T[]) => void;
  /** Add new row */
  addRow: (row: T) => void;
  /** Update row by index */
  updateRow: (index: number, row: T) => void;
  /** Remove row by index */
  removeRow: (index: number) => void;
  /** Clear all data */
  clearData: () => void;
  /** Selected rows */
  selectedRows: T[];
  /** Set selected rows */
  setSelectedRows: (rows: T[]) => void;
  /** Grid API reference */
  gridApi: GridApi<T> | null;
  /** Set grid API */
  setGridApi: (api: GridApi<T> | null) => void;
  /** Refresh grid */
  refreshGrid: () => void;
  /** Export data to CSV */
  exportToCsv: (filename?: string) => void;
  /** Get filtered data */
  getFilteredData: () => T[];
}

export function useDataTable<T extends Record<string, any>>({
  initialData = [],
  columnDefs: _columnDefs,
  enableSelection: _enableSelection = false,
  selectionType: _selectionType = 'single',
  onSelectionChange,
}: UseDataTableOptions<T>): UseDataTableReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);

  // Add new row
  const addRow = useCallback((row: T) => {
    setData(prev => [...prev, row]);
  }, []);

  // Update row by index
  const updateRow = useCallback((index: number, row: T) => {
    setData(prev => prev.map((item, i) => i === index ? row : item));
  }, []);

  // Remove row by index
  const removeRow = useCallback((index: number) => {
    setData(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    setData([]);
  }, []);

  // Refresh grid
  const refreshGrid = useCallback(() => {
    if (gridApi) {
      gridApi.refreshCells();
    }
  }, [gridApi]);

  // Export to CSV
  const exportToCsv = useCallback((filename = 'export.csv') => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: filename,
      });
    }
  }, [gridApi]);

  // Get filtered data
  const getFilteredData = useCallback(() => {
    if (!gridApi) return data;

    const filteredData: T[] = [];
    gridApi.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) {
        filteredData.push(node.data);
      }
    });
    return filteredData;
  }, [gridApi, data]);

  // Handle selection change
  const handleSelectionChange = useCallback((rows: T[]) => {
    setSelectedRows(rows);
    if (onSelectionChange) {
      onSelectionChange(rows);
    }
  }, [onSelectionChange]);

  return {
    data,
    setData,
    addRow,
    updateRow,
    removeRow,
    clearData,
    selectedRows,
    setSelectedRows: handleSelectionChange,
    gridApi,
    setGridApi,
    refreshGrid,
    exportToCsv,
    getFilteredData,
  };
}
