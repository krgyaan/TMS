import React, { useState, useEffect } from 'react';
import type { ColDef } from 'ag-grid-community';
import DataTable from '../ui/data-table';
import { useDataTable } from '../../hooks/use-data-table';

export interface IndexPageConfig<T> {
    title: string;
    description?: string;
    columnDefs: ColDef<T>[];
    dataFetcher: () => Promise<T[]>;
    enableSelection?: boolean;
    selectionType?: 'single' | 'multiple';
    onSelectionChange?: (selectedRows: T[]) => void;
    actions?: React.ReactNode;
    height?: string | number;
}

interface IndexPageTemplateProps<T> {
    config: IndexPageConfig<T>;
}

const IndexPageTemplate = <T extends Record<string, any>>({
    config,
}: IndexPageTemplateProps<T>) => {
    const [loading, setLoading] = useState(false);

    const {
        data,
        setData,
        selectedRows,
        setSelectedRows,
        setGridApi,
        exportToCsv,
    } = useDataTable<T>({
        columnDefs: config.columnDefs,
        enableSelection: config.enableSelection,
        selectionType: config.selectionType,
        onSelectionChange: config.onSelectionChange,
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await config.dataFetcher();
                setData(result);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [config.dataFetcher, setData]);

    const handleGridReady = (event: any) => {
        setGridApi(event.api);
    };

    const handleExport = () => {
        exportToCsv(`${config.title.toLowerCase().replace(/\s+/g, '-')}.csv`);
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h1>
                {config.description && (
                    <p className="text-gray-600">{config.description}</p>
                )}
            </div>

            {/* Action buttons */}
            <div className="mb-4 flex gap-2 items-center">
                <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Export CSV
                </button>
                {config.actions}
                {selectedRows.length > 0 && (
                    <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">
                        {selectedRows.length} row(s) selected
                    </div>
                )}
            </div>

            {/* Data Table */}
            <DataTable
                data={data}
                columnDefs={config.columnDefs}
                loading={loading}
                height={config.height || 500}
                enablePagination={true}
                pageSize={20}
                enableSorting={true}
                enableFiltering={true}
                enableRowSelection={config.enableSelection}
                selectionType={config.selectionType}
                onSelectionChanged={setSelectedRows}
                onGridReady={handleGridReady}
                className="w-full"
            />
        </div>
    );
};

export default IndexPageTemplate;
