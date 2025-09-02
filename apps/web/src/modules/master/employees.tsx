import type { ColDef } from 'ag-grid-community';
import IndexPageTemplate from '@/components/templates/IndexPageTemplate';

interface Employee {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    status: string;
    joinDate: string;
}

const Employees = () => {
    const columnDefs: ColDef<Employee>[] = [
        { field: 'name', headerName: 'Name', flex: 2 },
        { field: 'email', headerName: 'Email', flex: 2 },
        { field: 'department', headerName: 'Department', flex: 1 },
        { field: 'position', headerName: 'Position', flex: 1 },
        {
            field: 'status',
            headerName: 'Status',
            flex: 1,
            cellRenderer: (params: any) => {
                const status = params.value;
                const statusColors = {
                    'Active': 'bg-green-100 text-green-800',
                    'Inactive': 'bg-red-100 text-red-800',
                    'On Leave': 'bg-yellow-100 text-yellow-800',
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                        {status}
                    </span>
                );
            },
        },
        {
            field: 'joinDate',
            headerName: 'Join Date',
            flex: 1,
            valueFormatter: (params) => new Date(params.value).toLocaleDateString('en-IN'),
        },
    ];

    const dataFetcher = async (): Promise<Employee[]> => {
        // Replace with your actual API call
        return [
            {
                id: '1',
                name: 'John Doe',
                email: 'john.doe@company.com',
                department: 'IT',
                position: 'Developer',
                status: 'Active',
                joinDate: '2023-01-15',
            },
            {
                id: '2',
                name: 'Jane Smith',
                email: 'jane.smith@company.com',
                department: 'HR',
                position: 'Manager',
                status: 'Active',
                joinDate: '2022-06-10',
            },
        ];
    };

    const config = {
        title: 'Employees',
        description: 'Manage employee information and records',
        columnDefs,
        dataFetcher,
        enableSelection: true,
        selectionType: 'multiple' as const,
        onSelectionChange: (selectedRows: Employee[]) => {
            console.log('Selected employees:', selectedRows);
        },
    };

    return <IndexPageTemplate config={config} />;
};

export default Employees;
