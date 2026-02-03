# Guide: Adding New Columns to List Pages

This guide explains how to add new columns to list pages in the TMS application. It covers both frontend and backend changes, and how the automatic filter detection works.

## Table of Contents

1. [Frontend Column Addition](#frontend-column-addition)
2. [Backend Column Addition](#backend-column-addition)
3. [Automatic Filter Detection](#automatic-filter-detection)
4. [Example Workflows](#example-workflows)
5. [Best Practices](#best-practices)

---

## Frontend Column Addition

### Step 1: Update TypeScript Types

If the column represents a new field, add it to the relevant type definition file.

**Location**: `web/src/modules/{module}/{feature}/helpers/{feature}.types.ts`

**Example**:
```typescript
export type DashboardRow = {
    // ... existing fields
    newField: string | null;  // Add your new field
};
```

### Step 2: Add Column Definition

Add the column definition to the `colDefs` array in your list page component.

**Location**: `web/src/modules/{module}/{feature}/{Feature}ListPage.tsx`

**Example**:
```typescript
const colDefs = useMemo<ColDef<DashboardRow>[]>(
    () => [
        // ... existing columns
        {
            field: 'newField',
            colId: 'newField',  // Important: colId is used for sorting
            headerName: 'New Column',
            width: 150,
            sortable: true,
            filter: true,
            valueGetter: (params) => params.data?.newField || '—',
            // Optional: Custom cell renderer
            cellRenderer: (params: any) => {
                const value = params.value;
                if (!value) return '—';
                return <Badge variant="outline">{value}</Badge>;
            },
        },
    ],
    [/* dependencies */]
);
```

### Step 3: Column Properties Explained

- **`field`**: The property name in your data object
- **`colId`**: Unique identifier for the column (used for sorting). Should match `field` if possible
- **`headerName`**: Display name shown in the table header
- **`sortable`**: Whether the column can be sorted (default: true)
- **`filter`**: Whether the column can be filtered (default: true)
- **`valueGetter`**: Function to extract the value from row data
- **`cellRenderer`**: Custom React component to render the cell content
- **`valueFormatter`**: Function to format the value (for display only, doesn't affect sorting)

### Step 4: Common Column Patterns

#### Date Column
```typescript
{
    field: 'createdDate',
    colId: 'createdDate',
    headerName: 'Created Date',
    width: 150,
    sortable: true,
    valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
}
```

#### Amount Column
```typescript
{
    field: 'totalAmount',
    colId: 'totalAmount',
    headerName: 'Total Amount',
    width: 130,
    sortable: true,
    valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
}
```

#### Status Column with Badge
```typescript
{
    field: 'status',
    colId: 'status',
    headerName: 'Status',
    width: 120,
    sortable: true,
    cellRenderer: (params: any) => {
        const status = params.value;
        if (!status) return '—';
        return <Badge variant={getStatusVariant(status)}>{status}</Badge>;
    },
}
```

---

## Backend Column Addition

### Step 1: Add Field to SELECT Query

Add the field to the SELECT statement in your service file.

**Location**: `api/src/modules/{module}/{feature}/{feature}.service.ts`

**Example**:
```typescript
const rows = await this.db
    .select({
        // ... existing fields
        newField: someTable.newField,  // Add your new field
    })
    .from(someTable)
    // ... joins and where clauses
```

### Step 2: Update DTO/Type Definitions

Add the field to the DTO or return type.

**Location**: `api/src/modules/{module}/{feature}/helpers/{feature}.types.ts` or `dto/{feature}.dto.ts`

**Example**:
```typescript
export interface DashboardRow {
    // ... existing fields
    newField: string | null;
}
```

### Step 3: Add Search Support (Optional)

If the column should be searchable, add it to the search conditions.

**Location**: `api/src/modules/{module}/{feature}/{feature}.service.ts`

**Example**:
```typescript
if (filters?.search) {
    const searchStr = `%${filters.search}%`;
    const searchConditions: any[] = [
        sql`${existingTable.existingField} ILIKE ${searchStr}`,
        sql`${someTable.newField} ILIKE ${searchStr}`,  // Add your new field
    ];
    conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
}
```

### Step 4: Add Sorting Support

Add sorting support in the `sortBy` switch statement.

**Location**: `api/src/modules/{module}/{feature}/{feature}.service.ts`

**Example**:
```typescript
if (sortBy) {
    const sortFn = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
        case 'existingField':
            orderByClause = sortFn(existingTable.existingField);
            break;
        case 'newField':  // Add your new field
            orderByClause = sortFn(someTable.newField);
            break;
        default:
            orderByClause = sortFn(defaultField);
    }
}
```

**Important**: The `sortBy` value should match the `colId` from the frontend column definition.

---

## Automatic Filter Detection

The `TableSortFilter` component automatically detects date and amount columns based on field names and header names.

### Date Column Detection

Columns are detected as date columns if their `field` or `colId` contains any of these keywords (case-insensitive):
- `date`
- `time`
- `created`
- `updated`
- `due`
- `expiry`
- `deadline`
- `submission`
- `dispatch`
- `approval`
- `rejection`

**Example Field Names That Will Be Detected**:
- `dueDate` ✅
- `createdAt` ✅
- `submissionTime` ✅
- `expiryDate` ✅
- `approvalDate` ✅

### Amount Column Detection

Columns are detected as amount columns if their `field` or `colId` contains any of these keywords (case-insensitive):
- `amount`
- `price`
- `value`
- `fee`
- `cost`
- `total`
- `sum`
- `gst`
- `emd`
- `tenderfee`
- `processingfee`
- `fdr`
- `cheque`
- `dd`
- `bg`
- `bt`
- `pop`

**Example Field Names That Will Be Detected**:
- `totalAmount` ✅
- `finalPrice` ✅
- `tenderValue` ✅
- `processingFee` ✅
- `fdrAmount` ✅

### How It Works

1. The `TableSortFilter` component scans all `columnDefs`
2. It checks both `field` and `colId` properties
3. It also checks `headerName` for additional context
4. Columns matching date patterns appear in "Sort by Date" section
5. Columns matching amount patterns appear in "Sort by Amount" section
6. The component uses `colId` (or `field` as fallback) for sorting

### Making Columns Appear in Filters

To ensure your column appears in the filter dropdown:

1. **Use descriptive field names**: Include keywords like "date", "amount", "price", etc.
2. **Set `colId` explicitly**: Always set `colId` to match your `field` name
3. **Make it sortable**: Set `sortable: true` in column definition
4. **Backend sorting support**: Ensure backend supports sorting by this `colId`

---

## Example Workflows

### Example 1: Adding a "Payment Date" Column

#### Frontend Changes

**File**: `web/src/modules/bi-dashboard/payments/PaymentListPage.tsx`

```typescript
// 1. Add to colDefs
const colDefs = useMemo<ColDef<PaymentRow>[]>(
    () => [
        // ... existing columns
        {
            field: 'paymentDate',
            colId: 'paymentDate',  // Important for sorting
            headerName: 'Payment Date',
            width: 150,
            sortable: true,
            valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
        },
    ],
    []
);
```

**File**: `web/src/modules/bi-dashboard/payments/helpers/payment.types.ts`

```typescript
export type PaymentRow = {
    // ... existing fields
    paymentDate: Date | null;  // Add new field
};
```

#### Backend Changes

**File**: `api/src/modules/bi-dashboard/payments/payments.service.ts`

```typescript
// 1. Add to SELECT query
const rows = await this.db
    .select({
        // ... existing fields
        paymentDate: payments.paymentDate,
    })
    .from(payments)
    // ... rest of query

// 2. Add to search conditions
if (filters?.search) {
    const searchStr = `%${filters.search}%`;
    const searchConditions: any[] = [
        sql`${payments.paymentDate}::text ILIKE ${searchStr}`,  // Add search support
    ];
    conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
}

// 3. Add sorting support
if (sortBy) {
    const sortFn = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
        case 'paymentDate':  // Match colId from frontend
            orderByClause = sortFn(payments.paymentDate);
            break;
        // ... other cases
    }
}
```

**Result**: The "Payment Date" column will automatically appear in the "Sort by Date" section of the Filters dropdown.

---

### Example 2: Adding a "Tax Amount" Column

#### Frontend Changes

**File**: `web/src/modules/bi-dashboard/payments/PaymentListPage.tsx`

```typescript
const colDefs = useMemo<ColDef<PaymentRow>[]>(
    () => [
        // ... existing columns
        {
            field: 'taxAmount',
            colId: 'taxAmount',  // Important for sorting
            headerName: 'Tax Amount',
            width: 130,
            sortable: true,
            valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
        },
    ],
    []
);
```

**File**: `web/src/modules/bi-dashboard/payments/helpers/payment.types.ts`

```typescript
export type PaymentRow = {
    // ... existing fields
    taxAmount: string | null;  // Add new field
};
```

#### Backend Changes

**File**: `api/src/modules/bi-dashboard/payments/payments.service.ts`

```typescript
// 1. Add to SELECT query
const rows = await this.db
    .select({
        // ... existing fields
        taxAmount: payments.taxAmount,
    })
    .from(payments)
    // ... rest of query

// 2. Add to search conditions
if (filters?.search) {
    const searchStr = `%${filters.search}%`;
    const searchConditions: any[] = [
        sql`${payments.taxAmount}::text ILIKE ${searchStr}`,  // Add search support
    ];
    conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
}

// 3. Add sorting support
if (sortBy) {
    const sortFn = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
        case 'taxAmount':  // Match colId from frontend
            orderByClause = sortFn(payments.taxAmount);
            break;
        // ... other cases
    }
}
```

**Result**: The "Tax Amount" column will automatically appear in the "Sort by Amount" section of the Filters dropdown.

---

## Best Practices

### 1. Naming Conventions

- **Date columns**: Use names ending with "Date", "Time", or containing "created", "updated", "due", etc.
- **Amount columns**: Use names containing "amount", "price", "value", "fee", "cost", etc.
- **Consistent colId**: Always set `colId` to match `field` name

### 2. Type Safety

- Always update TypeScript types when adding new fields
- Use proper types (`Date | null`, `string | null`, `number | null`, etc.)
- Ensure backend DTOs match frontend types

### 3. Search Considerations

- Add date fields to search with `::text` cast: `sql`${table.dateField}::text ILIKE ${searchStr}``
- Add numeric/amount fields to search with `::text` cast: `sql`${table.amountField}::text ILIKE ${searchStr}``
- Only add fields that make sense to search (avoid IDs, foreign keys, etc.)

### 4. Sorting Considerations

- Always add sorting support in backend for new sortable columns
- Ensure `sortBy` value matches `colId` from frontend
- Use appropriate sort functions (`asc` or `desc`)

### 5. Performance

- Only add columns that are actually displayed
- Avoid adding too many searchable fields (can impact query performance)
- Use database indexes for frequently sorted columns

### 6. User Experience

- Provide meaningful `headerName` values
- Use appropriate column widths
- Add cell renderers for better visual presentation (badges, formatted dates, etc.)
- Handle null/empty values gracefully (show "—" or similar)

---

## Quick Reference Checklist

When adding a new column:

- [ ] Update frontend TypeScript types
- [ ] Add column definition to `colDefs` with proper `field`, `colId`, `headerName`
- [ ] Set `sortable: true` if column should be sortable
- [ ] Add cell renderer/formatter if needed
- [ ] Update backend SELECT query
- [ ] Update backend DTO/types
- [ ] Add to search conditions (if searchable)
- [ ] Add to sorting switch statement (if sortable)
- [ ] Test column appears correctly
- [ ] Test sorting works
- [ ] Test search works (if applicable)
- [ ] Verify column appears in Filters dropdown (if date/amount type)

---

## Troubleshooting

### Column doesn't appear in Filters dropdown

1. **Check field name**: Ensure field name contains date/amount keywords
2. **Check colId**: Ensure `colId` is set and matches field name
3. **Check sortable**: Ensure `sortable: true` is set
4. **Check backend**: Ensure backend supports sorting by this `colId`

### Sorting doesn't work

1. **Check colId match**: Ensure frontend `colId` matches backend `sortBy` case
2. **Check backend**: Verify sorting is implemented in backend service
3. **Check data type**: Ensure backend is sorting the correct data type

### Search doesn't work

1. **Check backend**: Verify search condition is added to backend
2. **Check data type**: Use `::text` cast for dates and numbers in search
3. **Check field name**: Ensure field is included in search conditions

---

## Summary

Adding a new column involves:

1. **Frontend**: Update types → Add column definition → Configure display
2. **Backend**: Update SELECT → Update types → Add search (optional) → Add sorting
3. **Automatic**: The `TableSortFilter` component will automatically detect date/amount columns based on naming patterns

The key is to use descriptive field names that match the detection patterns, and ensure both frontend and backend are properly configured for the new column.
