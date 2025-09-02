import { useState, useEffect } from 'react';
import type { ColDef } from 'ag-grid-community';
import DataTable from '@/components/ui/data-table';
import { useDataTable } from '@/hooks/use-data-table';

// Sample data type
interface FinancialDoc {
    id: string;
    documentName: string;
    documentType: string;
    amount: number;
    status: string;
    date: string;
    vendor: string;
}

const FinancialDocsIndex = () => {
    // Sample data - replace with your actual data fetching logic
    const [loading, setLoading] = useState(false);

    // Column definitions
    const columnDefs: ColDef<FinancialDoc>[] = [
        {
            field: 'documentName',
            headerName: 'Document Name',
            sortable: true,
            filter: true,
            flex: 2,
        },
        {
            field: 'documentType',
            headerName: 'Type',
            sortable: true,
            filter: true,
            flex: 1,
        },
        {
            field: 'amount',
            headerName: 'Amount',
            sortable: true,
            filter: 'agNumberColumnFilter',
            flex: 1,
            valueFormatter: (params) => {
                return new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                }).format(params.value);
            },
        },
        {
            field: 'status',
            headerName: 'Status',
            sortable: true,
            filter: true,
            flex: 1,
            cellRenderer: (params: any) => {
                const status = params.value;
                const statusColors = {
                    'Pending': 'bg-yellow-100 text-yellow-800',
                    'Approved': 'bg-green-100 text-green-800',
                    'Rejected': 'bg-red-100 text-red-800',
                    'Draft': 'bg-gray-100 text-gray-800',
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                        {status}
                    </span>
                );
            },
        },
        {
            field: 'date',
            headerName: 'Date',
            sortable: true,
            filter: 'agDateColumnFilter',
            flex: 1,
            valueFormatter: (params) => {
                return new Date(params.value).toLocaleDateString('en-IN');
            },
        },
        {
            field: 'vendor',
            headerName: 'Vendor',
            sortable: true,
            filter: true,
            flex: 1,
        },
    ];

    // Use the data table hook
    const {
        data,
        setData,
        selectedRows,
        setSelectedRows,
        setGridApi,
        exportToCsv,
    } = useDataTable<FinancialDoc>({
        columnDefs,
        enableSelection: true,
        selectionType: 'multiple',
        onSelectionChange: (rows) => {
            console.log('Selected rows:', rows);
        },
    });

    // Sample data - replace with your API call
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            // Simulate API call
            setTimeout(() => {
                const sampleData: FinancialDoc[] = [
                    {
                        id: '1',
                        documentName: 'Invoice - ABC Corp',
                        documentType: 'Invoice',
                        amount: 50000,
                        status: 'Pending',
                        date: '2024-01-15',
                        vendor: 'ABC Corporation',
                    },
                    {
                        id: '2',
                        documentName: 'Receipt - XYZ Ltd',
                        documentType: 'Receipt',
                        amount: 25000,
                        status: 'Approved',
                        date: '2024-01-14',
                        vendor: 'XYZ Limited',
                    },
                    {
                        id: '3',
                        documentName: 'Contract - DEF Inc',
                        documentType: 'Contract',
                        amount: 100000,
                        status: 'Draft',
                        date: '2024-01-13',
                        vendor: 'DEF Incorporated',
                    },
                ];
                setData(sampleData);
                setLoading(false);
            }, 1000);
        };

        fetchData();
    }, [setData]);

    const handleGridReady = (event: any) => {
        setGridApi(event.api);
    };

    const handleExport = () => {
        exportToCsv('financial-documents.csv');
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Financial Documents</h1>
                <p className="text-gray-600">Manage your financial documents and records</p>
            </div>

            {/* Action buttons */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Export CSV
                </button>
                {selectedRows.length > 0 && (
                    <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">
                        {selectedRows.length} row(s) selected
                    </div>
                )}
            </div>

            {/* Data Table */}
            <DataTable
                data={data}
                columnDefs={columnDefs}
                loading={loading}
                height={500}
                enablePagination={true}
                pageSize={20}
                enableSorting={true}
                enableFiltering={true}
                enableRowSelection={true}
                selectionType="multiple"
                onSelectionChanged={setSelectedRows}
                onGridReady={handleGridReady}
                className="w-full"
            />
        </div>
    );
};

export default FinancialDocsIndex;
