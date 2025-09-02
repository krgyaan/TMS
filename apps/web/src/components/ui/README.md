# DataTable Component

A reusable DataTable component built with AG Grid Community (free tier) for displaying tabular data with advanced features.

## Features

- ✅ **Free Tier**: Uses only AG Grid Community features
- ✅ **TypeScript Support**: Fully typed for better development experience
- ✅ **Pagination**: Built-in pagination with customizable page sizes
- ✅ **Sorting**: Column sorting functionality
- ✅ **Filtering**: Column filtering with various filter types
- ✅ **Row Selection**: Single or multiple row selection
- ✅ **Export**: CSV export functionality
- ✅ **Loading States**: Built-in loading and empty state handling
- ✅ **Responsive**: Works well on different screen sizes
- ✅ **Customizable**: Easy to configure columns, styling, and behavior

## Installation

The required dependencies are already installed in your project:

```bash
npm install ag-grid-community ag-grid-react
```

## Basic Usage

### 1. Using the DataTable Component Directly

```tsx
import DataTable from '../components/ui/data-table';
import type { ColDef } from 'ag-grid-community';

interface MyData {
  id: string;
  name: string;
  email: string;
  status: string;
}

const MyComponent = () => {
  const data: MyData[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
  ];

  const columnDefs: ColDef<MyData>[] = [
    { field: 'name', headerName: 'Name', flex: 2 },
    { field: 'email', headerName: 'Email', flex: 2 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      cellRenderer: (params: any) => {
        const status = params.value;
        const color = status === 'Active' ? 'text-green-600' : 'text-red-600';
        return <span className={color}>{status}</span>;
      }
    },
  ];

  return (
    <DataTable
      data={data}
      columnDefs={columnDefs}
      height={400}
      enablePagination={true}
      enableSorting={true}
      enableFiltering={true}
    />
  );
};
```

### 2. Using the useDataTable Hook

```tsx
import { useDataTable } from '../hooks/use-data-table';
import DataTable from '../components/ui/data-table';

const MyComponent = () => {
  const {
    data,
    setData,
    selectedRows,
    setSelectedRows,
    setGridApi,
    exportToCsv,
  } = useDataTable<MyData>({
    columnDefs,
    enableSelection: true,
    selectionType: 'multiple',
    onSelectionChange: (rows) => {
      console.log('Selected rows:', rows);
    },
  });

  const handleExport = () => {
    exportToCsv('my-data.csv');
  };

  return (
    <div>
      <button onClick={handleExport}>Export CSV</button>
      <DataTable
        data={data}
        columnDefs={columnDefs}
        onGridReady={(event) => setGridApi(event.api)}
        onSelectionChanged={setSelectedRows}
        enableRowSelection={true}
        selectionType="multiple"
      />
    </div>
  );
};
```

### 3. Using the IndexPageTemplate

```tsx
import IndexPageTemplate from '../components/templates/IndexPageTemplate';
import type { ColDef } from 'ag-grid-community';

const MyIndexPage = () => {
  const columnDefs: ColDef<MyData>[] = [
    { field: 'name', headerName: 'Name', flex: 2 },
    { field: 'email', headerName: 'Email', flex: 2 },
    { field: 'status', headerName: 'Status', flex: 1 },
  ];

  const dataFetcher = async (): Promise<MyData[]> => {
    // Replace with your actual API call
    const response = await fetch('/api/my-data');
    return response.json();
  };

  const config = {
    title: 'My Data',
    description: 'Manage your data records',
    columnDefs,
    dataFetcher,
    enableSelection: true,
    selectionType: 'multiple' as const,
    onSelectionChange: (selectedRows: MyData[]) => {
      console.log('Selected rows:', selectedRows);
    },
  };

  return <IndexPageTemplate config={config} />;
};
```

## Column Configuration

### Basic Column

```tsx
{ field: 'name', headerName: 'Name', flex: 2 }
```

### Column with Custom Renderer

```tsx
{
  field: 'status',
  headerName: 'Status',
  flex: 1,
  cellRenderer: (params: any) => {
    const status = params.value;
    const statusColors = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {status}
      </span>
    );
  },
}
```

### Column with Value Formatter

```tsx
{
  field: 'amount',
  headerName: 'Amount',
  flex: 1,
  valueFormatter: (params) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(params.value);
  },
}
```

### Column with Date Filter

```tsx
{
  field: 'date',
  headerName: 'Date',
  flex: 1,
  filter: 'agDateColumnFilter',
  valueFormatter: (params) => {
    return new Date(params.value).toLocaleDateString('en-IN');
  },
}
```

## Props

### DataTable Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | - | Array of data to display |
| `columnDefs` | `ColDef<T>[]` | - | Column definitions |
| `height` | `string \| number` | `400` | Height of the table |
| `loading` | `boolean` | `false` | Whether to show loading state |
| `enablePagination` | `boolean` | `true` | Enable pagination |
| `pageSize` | `number` | `20` | Page size for pagination |
| `enableSorting` | `boolean` | `true` | Enable column sorting |
| `enableFiltering` | `boolean` | `true` | Enable column filtering |
| `enableRowSelection` | `boolean` | `false` | Enable row selection |
| `selectionType` | `'single' \| 'multiple'` | `'single'` | Selection type |
| `onSelectionChanged` | `(rows: T[]) => void` | - | Callback when selection changes |
| `onGridReady` | `(event: GridReadyEvent<T>) => void` | - | Callback when grid is ready |
| `className` | `string` | `''` | Custom CSS class |

## Styling

The component uses Tailwind CSS classes and AG Grid's Alpine theme. You can customize the appearance by:

1. **Custom CSS Classes**: Pass a `className` prop to add custom styling
2. **Cell Renderers**: Use custom cell renderers with Tailwind classes
3. **Theme Override**: Override AG Grid CSS variables in your global styles

## Examples

See the following files for complete examples:
- `apps/web/src/modules/accounts/financial-docs/index.tsx` - Direct DataTable usage
- `apps/web/src/modules/master/employees.tsx` - IndexPageTemplate usage

## Troubleshooting

### AG Grid Module Registration Error

If you see the error "No AG Grid modules are registered!" or "ModuleRegistry.registerModules is not a function", make sure you have imported the setup file:

```tsx
import './lib/ag-grid-setup';
```

This is already done in `main.tsx` and the DataTable component, but if you're using AG Grid directly, make sure to import the setup.

**Common Issues:**
- Make sure all AG Grid packages are the same version
- Ensure the setup file is imported before any grid components are used
- If you see "registerModules is not a function", check your AG Grid version compatibility

### TypeScript Errors

Make sure to use proper TypeScript types:

```tsx
import type { ColDef, GridReadyEvent } from 'ag-grid-community';
```

### Performance Issues

For large datasets, consider:
- Using pagination
- Implementing server-side filtering/sorting
- Using row virtualization (enabled by default)
