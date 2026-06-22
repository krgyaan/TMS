# New session - 2026-06-13T10:37:31.362Z

**Session ID:** ses_13f71189dffeA3vh4pHWRX5WBh
**Created:** 6/13/2026, 4:07:31 PM
**Updated:** 6/13/2026, 4:14:27 PM

---

## User

see the DataTable lib used in this project, and plan that how can we persist the search, column resized, dashboard tab changed for users. Currently when I search then view the details (etc) via action menu and come back on dashboard then tab and search reset already

---

## Assistant (Plan · DeepSeek V4 Flash Free · 110.5s)

_Thinking:_

The user wants to understand the DataTable library used in this project and plan how to persist search state, column resize state, and dashboard tab state when navigating away and coming back. Let me explore the codebase to understand the DataTable implementation.

**Tool: task**

**Input:**
```json
{
  "description": "Explore DataTable usage in project",
  "prompt": "Explore this codebase very thoroughly to understand how DataTable is used. I need to know:\n\n1. What datatable library/framework is being used (e.g., TanStack Table, AG Grid, custom, etc.)\n2. Where DataTable components are defined (component files)\n3. How search/filtering is implemented currently\n4. How column resizing is handled\n5. How dashboard tabs work (the tab state)\n6. How routing works (what happens when user navigates to details and comes back)\n7. Check for any existing state persistence mechanisms (URL params, localStorage, sessionStorage, etc.)\n8. Look at the Dashboard page in particular since that's what user references\n\nSearch in these patterns:\n- **/*.tsx, **/*.jsx for DataTable related components\n- Any files mentioning \"table\", \"datatable\", \"DataTable\"\n- Look at route/page files for dashboard\n- Look for search params, URL params usage\n- Look for localStorage or sessionStorage usage\n\nReturn:\n- The exact library used\n- Key file paths for DataTable, Dashboard, routing\n- How search/column resize/tab are currently implemented\n- Any existing persistence patterns\n- A summary of the navigation flow (what happens when user goes to details and back)",
  "subagent_type": "explore"
}
```

**Output:**
```
<task id="ses_13f6d36a3ffeSCD7F0SZ0Ikz0w" state="completed">
<task_result>
Now I have a thorough understanding. Let me compile the complete findings.

---

## Comprehensive DataTable & Codebase Analysis

### 1. DataTable Library Used

**AG Grid** (NOT TanStack Table)

- **Packages**: `ag-grid-community` v34.1.2 and `ag-grid-react` v34.1.2 (confirmed via `web/package.json`)
- **Registration**: `ModuleRegistry.registerModules([AllCommunityModule])` in `web/src/App.tsx` (line 8)
- **Theme**: Custom theme using `themeQuartz` with dark/light mode params in `web/src/components/data-grid/theme.ts`

### 2. DataTable Component Files

| File | Purpose |
|------|---------|
| **`/home/gyan/workspace/projects/TMS/web/src/components/ui/data-table.tsx`** | Core `DataTable` wrapper around `<AgGridReact>`. Contains all pagination logic (manual + auto), custom pagination footer, grid options, and all props. |
| **`/home/gyan/workspace/projects/TMS/web/src/components/data-grid/theme.ts`** | AG Grid theme configuration (accent color orange, font sizes, light/dark params) |
| **`/home/gyan/workspace/projects/TMS/web/src/components/data-grid/columns.ts`** | Shared column helpers: `tenderNameCol`, `dateCol`, `currencyCol`, `booleanIconCol` |
| **`/home/gyan/workspace/projects/TMS/web/src/components/data-grid/renderers/ActionColumnRenderer.tsx`** | Creates AG Grid cell renderer for action dropdown menus |
| **`/home/gyan/workspace/projects/TMS/web/src/components/data-grid/renderers/TenderNameCell.tsx`** | Custom cell renderer for tender name/ID |
| **`/home/gyan/workspace/projects/TMS/web/src/components/ui/ActionMenu.tsx`** | Dropdown menu component used inside action columns |
| **`/home/gyan/workspace/projects/TMS/web/src/components/ui/quick-filter.tsx`** | Segmented button group filter (AC/DC/All teams) |

**List pages using DataTable** (30+ files, all follow same pattern):
- BI Dashboard: `/web/src/modules/bi-dashboard/cheque/ChequeListPage.tsx`, `bank-guarantee/BankGuaranteeListPage.tsx`, `fdr/FdrListPage.tsx`, `pay-on-portal/PayOnPortalListPage.tsx`, `bank-tranfer/BankTransferListPage.tsx`, `demand-draft/DemandDraftListPage.tsx`, `tender-fee/TenderFeeListPage.tsx`
- Tendering: `tenders/TenderListPage.tsx`, `emds-tenderfees/EmdListPage.tsx`, `checklists/DocumentChecklistListPage.tsx`, `costing-sheets/CostingSheetListPage.tsx`, `costing-approvals/CostingApprovalListPage.tsx`, `bid-submissions/BidSubmissionListPage.tsx`, etc.
- Operations: `vendor-work-orders/VendorWorkOrderListPage.tsx`, `wo-details/WoDetailListPage.tsx`, `wo-basic-details/BasicDetailListPage.tsx`, `kick-off/KickOffListPage.tsx`, `contract-agreement/ContractAgreementListPage.tsx`
- Accounts: `imprest/ImprestAdminIndex.tsx`, `loan-advances/LoanAdvanceListPage.tsx`, `gst-checklists/index.tsx`, `tds-checklists/index.tsx`, `financial-docs/index.tsx`, `fixed-expenses/index.tsx`
- Other: `shared/finance-document/FinanceDocumentListPage.tsx`, `shared/pqr/PqrListPage.tsx`, `master/vendors/index.tsx`, etc.

### 3. How Search/Filtering Works

**Current pattern (server-side filtering)**:
1. A local `useState<string>('')` holds the raw search text
2. A custom `useDebouncedSearch(value, 300)` hook (file: `/web/src/hooks/useDebouncedSearch.ts`) debounces input by 300ms using `setTimeout`/`useEffect`
3. The debounced value is sent as a `search` parameter to the backend API hook (e.g., `useChequeDashboard({..., search: debouncedSearch || undefined})`)
4. The API service then passes it as a URL query param via `URLSearchParams`
5. When search changes, pagination resets to page 0 via `useEffect` watching `[activeTab, debouncedSearch, teamFilter]`
6. AG Grid's built-in `filter: true` is also set per column, enabling client-side column-level filtering

**Additional filtering**:
- `QuickFilter` component (segmented button toggle for AC/DC/All teams) - local state only
- AG Grid `sortable: true` per column, with `onSortChanged` handler that syncs sort state to local state and sends to server

**Key issue**: Search text is stored only in local `useState`. When the component unmounts (user navigates to details page), the search text is lost.

### 4. How Column Resizing Works

- Handled entirely by AG Grid's built-in resize mechanism
- In the DataTable component (`data-table.tsx` line 139): `defaultColDef.resizable: enableColumnResizing` (defaults to `true`)
- Each column can override via `resizable: false` in its `ColDef` definition
- Individual columns have `width`, `maxWidth`, `minWidth` properties set statically
- `autoSizeColumns` prop exists (line 64) that calls `event.api.autoSizeColumns()` on grid ready
- **No persistence of column widths**: When the user resizes columns and navigates away, the column widths reset to defaults on return. No `localStorage` or URL storage of column state.

### 5. How Dashboard Tabs Work

**Two patterns exist in the codebase**:

| Pattern | Tab Source | Persistence | Used By |
|---------|-----------|-------------|---------|
| **Local state only** | `useState<ChequeDashboardTab>('cheque-pending')` | **None** - lost on navigation | BI Dashboard pages (Cheque, Bank Guarantee, FDR, Demand Draft, Bank Transfer, Pay on Portal) |
| **URL search params (read-only)** | `useSearchParams()` -> `initialTab = searchParams.get('tab')` | Partially - reads from URL but does NOT update URL on tab change | Tendering pages (EMD/Tender Fees, Document Checklists, Costing Approvals, RFQs, etc.) |

**BI Dashboard tab implementation details** (e.g., `ChequeListPage.tsx`):
- `TABS_CONFIG` array defines all tabs with keys, names, icons, and descriptions
- `activeTab` state initialized as the first tab (e.g., `'cheque-pending'`)
- `Tabs` from `@radix-ui/react-tabs` with `value={activeTab}` / `onValueChange={setActiveTab}`
- Tab counts fetched from separate API (`useChequeDashboardCounts`)
- Each `TabsContent` conditionally renders `DataTable` only when `activeTab === tab.key`
- **When tab changes**: Pagination resets to page 0 via `useEffect`, new API call fires with the new tab name
- **No URL persistence**: The tab is never written to `?tab=` in the URL

**TenderFeeListPage** has a different pattern - it uses nested parent tabs (DD/Portal/Transfer) with separate sub-tabs for each, maintaining completely separate state objects (`ddSubTab`, `portalSubTab`, `transferSubTab`), each with their own pagination, sort, and search state.

### 6. How Routing Works

**Router**: React Router v7 (`react-router-dom` v7.8.2)

**Route structure** (`/web/src/app/routes/index.tsx`):
```
<ProtectedRoute>
  <ProfileProvider>
    <DashboardLayout>       ← Sidebar + Header + <Outlet />
      /                     → <Dashboard />
      /bi-dashboard/*       → BIDashboardRoutes (lazy)
        /cheque             → ChequeListPage
        /cheque/details/:id → ChequeDetailsPage
        /cheque/action/:id  → ChequeActionPage
        ... (fdr, bank-guarantee, etc.)
      /tendering/*          → TenderingRoutes
      /operations/*         → OperationsRoutes
      /accounts/*           → AccountsRoutes
      ...
```

**Navigation flow when user goes to details and comes back**:

1. **User is on list page** (e.g., `/bi-dashboard/cheque`) with:
   - Active tab = "cheque-pending", search = "ABC", page = 2, sort = by amount desc
   - All this state is in local `useState` (NOT in URL)

2. **User clicks "View Details"**: `navigate(paths.bi.chequeView(requestId))` -> URL becomes `/bi-dashboard/cheque/details/123`
   - The `ChequeListPage` component **unmounts** (it's a different route)
   - All local state (tab, search, pagination, sort, column widths) is **destroyed**

3. **User views details**: `ChequeDetailsPage` renders, fetches data by `:id`

4. **User clicks "Back" button**: `navigate(paths.bi.cheque)` -> URL becomes `/bi-dashboard/cheque`
   - The `ChequeListPage` component **mounts fresh**
   - All state reinitializes to defaults:
     - Tab resets to `'cheque-pending'`
     - Search is empty
     - Pagination resets to page 0
     - Sort resets to none
     - Column widths reset to defaults

**This means the user completely loses their context** every time they navigate to details and back.

### 7. Existing Persistence Mechanisms

| Mechanism | What's Stored | Files |
|-----------|---------------|-------|
| **`localStorage`** | Auth user data, active team ID | `lib/auth.ts` |
| **`localStorage`** | Theme preference ("light"/"dark") | `app/providers/ThemeProvider.tsx` |
| **`localStorage`** | BI action form draft auto-save (`cheque_action_data`, `fdr_action_data`, etc.) | Various BI action page/component files |
| **`sessionStorage`** | Auth redirect URL after 401 | `lib/axios.ts`, `hooks/api/useAuth.ts` |
| **`sessionStorage`** | Onboarding modal dismissed flag | `modules/dashboard.tsx` |
| **`useSearchParams`** (URL) | Tab state in some tendering pages (read on mount only, not written) | `checklists/DocumentChecklistListPage.tsx`, `emds-tenderfees/EmdListPage.tsx`, etc. |
| **`useSearchParams`** (URL) | Filter params for imprest views (userId, from, to) | Various imprest pages |
| **`useSearchParams`** (URL) | Mode params for create/edit forms | `emds-tenderfees/OldEmdCreatePage.tsx` |
| **React Query cache** | API data caching (tab-specific keys like `['cheques', tab, page, ...]`) | Various `useChequeDashboard` hooks |

**What is NOT persisted** (and gets lost on navigation):
- **Active tab** on BI Dashboard pages
- **Search/filter text**
- **Pagination state** (page number, page size)
- **Sort model** (which column, asc/desc)
- **Column widths** after user resize
- **Column visibility** / reorder

### 8. Dashboard Page (`/dashboard`)

- **File**: `/home/gyan/workspace/projects/TMS/web/src/modules/dashboard.tsx`
- **Route**: `/` (root) - rendered at `AppRoutes` line 54
- **Composition**:
  - Quick action cards (Add Imprest, Add Courier, New Tender, New Follow-up, BI Other Than EMDs)
  - Onboarding Status Tracker widget (HR/super users only) with expand/collapse, search, and status badges
  - Calendar section with Month/Week/List views (uses `@radix-ui/react-tabs`)
  - "Soon Expiring Timers" placeholder section
  - Onboarding completion modal (dismissed via `sessionStorage`)
- **Data source**: Currently uses hardcoded `mockDashboardData` (line 66-98). The real API integration appears not yet implemented.
- **No DataTable** is used on this page. It's purely a summary/overview dashboard. The BI Dashboard sub-pages (cheque, fdr, etc.) are where DataTable appears.

### Key File Paths Summary

```
Core DataTable:
  /home/gyan/workspace/projects/TMS/web/src/components/ui/data-table.tsx
  /home/gyan/workspace/projects/TMS/web/src/components/data-grid/theme.ts
  /home/gyan/workspace/projects/TMS/web/src/components/data-grid/columns.ts
  /home/gyan/workspace/projects/TMS/web/src/components/data-grid/renderers/ActionColumnRenderer.tsx
  /home/gyan/workspace/projects/TMS/web/src/components/ui/ActionMenu.tsx
  /home/gyan/workspace/projects/TMS/web/src/components/ui/quick-filter.tsx

Dashboard:
  /home/gyan/workspace/projects/TMS/web/src/modules/dashboard.tsx

Routing:
  /home/gyan/workspace/projects/TMS/web/src/app/routes/index.tsx
  /home/gyan/workspace/projects/TMS/web/src/app/routes/paths.ts
  /home/gyan/workspace/projects/TMS/web/src/app/routes/sections/bi-dashboard.routes.tsx
  /home/gyan/workspace/projects/TMS/web/src/app/layout/DashboardLayout.tsx

BI Dashboard List Pages (use DataTable with tabs):
  /home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/cheque/ChequeListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/bank-guarantee/BankGuaranteeListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/fdr/FdrListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/pay-on-portal/PayOnPortalListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/bank-tranfer/BankTransferListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/demand-draft/DemandDraftListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/tender-fee/TenderFeeListPage.tsx

Tendering List Pages (use DataTable with URL-based tabs):
  /home/gyan/workspace/projects/TMS/web/src/modules/tendering/emds-tenderfees/EmdListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/tendering/checklists/DocumentChecklistListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/tendering/costing-approvals/CostingApprovalListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/tendering/costing-sheets/CostingSheetListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/tendering/tender-approval/TenderApprovalListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/tendering/rfqs/RfqListPage.tsx
  /home/gyan/workspace/projects/TMS/web/src/modules/tendering/physical-docs/PhysicalDocsListPage.tsx

Persistence:
  /home/gyan/workspace/projects/TMS/web/src/lib/auth.ts (localStorage for auth)
  /home/gyan/workspace/projects/TMS/web/src/app/providers/ThemeProvider.tsx (localStorage for theme)
  /home/gyan/workspace/projects/TMS/web/src/hooks/useDebouncedSearch.ts (custom debounce hook)
```

### Navigation Flow Diagram

```
[ChequeListPage]                          [ChequeDetailsPage]
  state:                                    state:
    activeTab = 'cheque-pending'              (fetched from API by :id)
    search = 'ABC'
    pagination = { pageIndex: 1, pageSize: 50 }
    sortModel = [{colId:'amount', sort:'desc'}]

  |                                            |
  |-- click "View Details" ------------------>|
  |   navigate('/bi-dashboard/cheque/details/123')  |
  |                                            |
  |   [COMPONENT UNMOUNTS]                    |-- renders cheque info
  |   ALL STATE LOST                          |
  |                                            |
  |<-- click "Back" --------------------------|
  |   navigate('/bi-dashboard/cheque')       |
  |                                            |
  |   [COMPONENT MOUNTS FRESH]                |
  |   activeTab = 'cheque-pending' (default)  |
  |   search = '' (empty)                     |
  |   pagination = { pageIndex: 0, pageSize: 50 }  |
  |   sortModel = [] (none)                   |
  v                                            v
```
</task_result>
</task>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 13.9s)

_Thinking:_

Now I have a thorough understanding of the codebase. Let me plan the approach for persisting DataTable state. Let me think about the best approach:

## Options for Persistence

### Option 1: URL Search Params
- Pros: Shareable URLs, bookmarkable, server-renderable, no storage quota issues
- Cons: Noisy URLs, limited size, need to serialize/deserialize complex state

### Option 2: localStorage
- Pros: Can store complex state, persists across sessions, simple API
- Cons: Not shareable, storage quota (5-10MB), need to handle stale data

### Option 3: sessionStorage
- Pros: Simpler, auto-clears on tab close, can store complex state
- Cons: Lost on tab close, not shareable

### Option 4: React Context + localStorage
- Pros: Global state management, automatic persistence
- Cons: More complex setup, need to handle serialization

### Option 5: URL params + localStorage combination
- Tab state → URL params (for shareability)
- Column resize state → localStorage (too noisy for URL)
- Search text → URL params (easy to serialize)

I think the best approach is a combination:
- **Tab**: Store in URL search params (already partially done in some pages)
- **Search**: Store in URL search params
- **Pagination**: Store in URL search params (page, page size)
- **Column widths**: Store in localStorage (too much data for URL, and resizing is personal preference)
- **Sort**: Could go either way - URL params for shareable state, localStorage for preference

Actually, let me reconsider. The user's main concern is:
1. Search persists when coming back from details page
2. Column resize persists when coming back
3. Dashboard tab persists when coming back

For the BI Dashboard specifically, a good approach would be:
- Use URL search params for tab, search, and pagination (these are "navigation state")
- Use localStorage for column widths (these are "user preference state")

Let me look more closely at the DataTable component to understand what props/features are available for column state management.

Actually, I should also look at whether AG Grid provides any built-in persistence mechanisms. AG Grid has a `columnState` and can persist column state via `onColumnResized` or `onColumnMoved` events.

Let me also think about the pages that have URL-based tabs (tendering pages). Those already partially persist tab state. The BI Dashboard pages don't.

Here's my plan:

### Approach: URL Search Params for Navigation State + localStorage for UI Preferences

1. **Create a reusable hook** `useDataTableState` that manages persistence:
   - Reads initial state from URL search params (tab, search, page)
   - Writes state changes back to URL search params
   - Manages column widths in localStorage
   - Keyed by route path + tab combination

2. **URL Search Params** to persist:
   - `tab` - active dashboard tab
   - `q` - search query
   - `page` - current page number (maybe)
   - `sort` - sort column and direction (maybe)

3. **localStorage** to persist:
   - `table-column-state:{route-key}:{tab}` - column widths, visibility, order

4. **Integration points**:
   - Modify `DataTable` wrapper to accept external column state and fire column state change events
   - Modify each list page to use the new `useDataTableState` hook instead of raw `useState`

Let me look at the DataTable component more closely to understand what needs to change.

Actually, I want to also check - does this project use AG Grid's Server-side Row Model or Client-side Row Model? From the analysis, it seems like it's client-side since they pass `rowData` directly.

Let me also think about the complexity. There are 30+ pages using DataTable. We need a generic solution that works across all of them.

### Refined Plan

1. **Create `useDataTableState` hook** (or similar name) that:
   - Accepts a storage key (derived from route path)
   - Syncs `tab`, `search`, `page`, `sort` with URL search params (using `useSearchParams`)
   - Syncs column state with `localStorage`
   - Returns state and setters

2. **Modify `DataTable` component** to:
   - Accept optional `columnState` prop and `onColumnStateChanged` callback
   - On grid ready, restore column state from localStorage
   - On column resize/move/sort, persist to localStorage

3. **Modify BI Dashboard list pages** to:
   - Use `useDataTableState` instead of local `useState`
   - Initialize tab from URL search params
   - Write tab changes to URL search params

Let me look at a few specific files to refine this plan further before presenting it to the user.

Let me look at the key files to refine the plan.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gyan/workspace/projects/TMS/web/src/components/ui/data-table.tsx"
}
```

**Output:**
```
<path>/home/gyan/workspace/projects/TMS/web/src/components/ui/data-table.tsx</path>
<type>file</type>
<content>
1: // D:\tms\web\src\components\ui\data-table.tsx
2: import { useMemo, useCallback } from 'react';
3: import { AgGridReact } from 'ag-grid-react';
4: import type { ColDef, GridOptions, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
5: import { myAgTheme } from '@/components/data-grid/theme';
6: import { Button } from "@/components/ui/button";
7: import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
8: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
9: // import "ag-grid-community/styles/ag-grid.css";
10: import "ag-grid-community/styles/ag-theme-quartz.css";
11: 
12: export interface DataTableProps<T = any> {
13:     data: T[];
14:     columnDefs: ColDef<T>[];
15:     gridOptions?: Partial<GridOptions<T>>;
16:     loading?: boolean;
17:     enableCellTextSelection?: boolean;
18:     onGridReady?: (event: GridReadyEvent<T>) => void;
19:     className?: string;
20:     enablePagination?: boolean;
21:     pageSize?: number;
22:     enableSorting?: boolean;
23:     enableFiltering?: boolean;
24:     enableColumnResizing?: boolean;
25:     enableRowSelection?: boolean;
26:     selectionType?: 'single' | 'multiple';
27:     onSelectionChanged?: (selectedRows: T[]) => void;
28:     themeOverride?: any;
29:     manualPagination?: boolean;
30:     rowCount?: number;
31:     paginationState?: {
32:         pageIndex: number;
33:         pageSize: number;
34:     };
35:     onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
36:     autoSizeColumns?: boolean | string[];
37:     showTotalCount?: boolean;
38:     showLengthChange?: boolean;
39:     pageSizeOptions?: number[];
40:     onPageSizeChange?: (pageSize: number) => void;
41: }
42: 
43: const DataTable = <T extends Record<string, any>>({
44:     data,
45:     enableCellTextSelection = true,
46:     columnDefs,
47:     gridOptions = {},
48:     loading = false,
49:     manualPagination = false,
50:     rowCount = 0,
51:     paginationState,
52:     onPaginationChange,
53:     onGridReady,
54:     className = '',
55:     enablePagination = true,
56:     pageSize = 50,
57:     enableSorting = true,
58:     enableFiltering = true,
59:     enableColumnResizing = true,
60:     enableRowSelection = false,
61:     selectionType = 'single',
62:     onSelectionChanged,
63:     themeOverride,
64:     autoSizeColumns,
65:     showTotalCount = true,
66:     showLengthChange = true,
67:     pageSizeOptions = [5, 10, 25, 50, 100],
68:     onPageSizeChange,
69: }: DataTableProps<T>) => {
70: 
71:     // 1. Calculate Pagination Logic
72:     const activePageSize = manualPagination ? (paginationState?.pageSize ?? 50) : pageSize;
73:     const currentPage = (paginationState?.pageIndex ?? 0) + 1;
74:     const totalPages = manualPagination ? Math.ceil(rowCount / activePageSize) : 0;
75: 
76:     // Generate page numbers to display (show max 5 pages around current)
77:     const getPageNumbers = () => {
78:         const pages: (number | string)[] = [];
79:         const maxPagesToShow = 5;
80: 
81:         if (totalPages <= maxPagesToShow) {
82:             // Show all pages if total is less than max
83:             for (let i = 1; i <= totalPages; i++) {
84:                 pages.push(i);
85:             }
86:         } else {
87:             // Show pages around current page
88:             let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
89:             let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
90: 
91:             // Adjust if we're near the end
92:             if (endPage - startPage < maxPagesToShow - 1) {
93:                 startPage = Math.max(1, endPage - maxPagesToShow + 1);
94:             }
95: 
96:             if (startPage > 1) {
97:                 pages.push(1);
98:                 if (startPage > 2) pages.push('...');
99:             }
100: 
101:             for (let i = startPage; i <= endPage; i++) {
102:                 pages.push(i);
103:             }
104: 
105:             if (endPage < totalPages) {
106:                 if (endPage < totalPages - 1) pages.push('...');
107:                 pages.push(totalPages);
108:             }
109:         }
110: 
111:         return pages;
112:     };
113: 
114:     const handlePageSizeChange = (newSize: string) => {
115:         const newPageSize = parseInt(newSize, 10);
116:         if (onPageSizeChange) {
117:             onPageSizeChange(newPageSize);
118:         } else if (onPaginationChange && paginationState) {
119:             // Reset to first page when changing page size
120:             onPaginationChange({ ...paginationState, pageSize: newPageSize, pageIndex: 0 });
121:         }
122:     };
123: 
124:     const handlePageChange = (page: number) => {
125:         if (onPaginationChange && paginationState) {
126:             onPaginationChange({ ...paginationState, pageIndex: page - 1 });
127:         }
128:     };
129: 
130:     // 2. Memoize Grid Options
131:     const defaultGridOptions: GridOptions<T> = useMemo(() => ({
132:         pagination: !manualPagination && enablePagination,
133:         paginationPageSize: activePageSize,
134:         suppressPaginationPanel: manualPagination,
135:         domLayout: 'autoHeight',
136:         defaultColDef: {
137:             sortable: enableSorting,
138:             filter: enableFiltering,
139:             resizable: enableColumnResizing,
140:             minWidth: 100,
141:             flex: 1,
142:         },
143: 
144:         rowSelection: enableRowSelection ? {
145:             mode: selectionType === 'multiple' ? 'multiRow' : 'singleRow',
146:             checkboxes: selectionType === 'multiple',
147:             headerCheckbox: selectionType === 'multiple',
148:             enableClickSelection: false,
149:         } as RowSelectionOptions : undefined,
150: 
151:         rowHeight: 40,
152:         headerHeight: 45,
153:         animateRows: true,
154:         noRowsOverlayComponent: () => (
155:             <div className="flex items-center justify-center h-full text-muted-foreground">
156:                 No data available
157:             </div>
158:         ),
159:     }), [enablePagination, activePageSize, enableSorting, enableFiltering, enableColumnResizing, enableRowSelection, selectionType, manualPagination]);
160: 
161:     const handleGridReady = useCallback((event: GridReadyEvent<T>) => {
162:         // Auto-size columns if enabled
163:         if (autoSizeColumns) {
164:             if (Array.isArray(autoSizeColumns)) {
165:                 // Auto-size specific columns
166:                 event.api.autoSizeColumns(autoSizeColumns);
167:             } else {
168:                 // Auto-size all columns - get all column IDs
169:                 const allColumnIds = event.api.getColumns()?.map(col => col.getColId()).filter((id): id is string => id !== null) || [];
170:                 if (allColumnIds.length > 0) {
171:                     event.api.autoSizeColumns(allColumnIds);
172:                 }
173:             }
174:         }
175:         if (onGridReady) onGridReady(event);
176:     }, [onGridReady, autoSizeColumns]);
177: 
178:     const handleSelectionChanged = useCallback((event: any) => {
179:         if (onSelectionChanged && enableRowSelection) {
180:             onSelectionChanged(event.api.getSelectedRows());
181:         }
182:     }, [onSelectionChanged, enableRowSelection]);
183: 
184:     return (
185:         <div className={`flex flex-col w-full h-full ${className}`}>
186: 
187:             {/* Grid Container: Takes remaining height */}
188:             <div className="relative w-full">
189: 
190:                 {loading && (
191:                     <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
192:                         <Loader2 className="h-8 w-8 animate-spin text-primary" />
193:                     </div>
194:                 )}
195: 
196:                 <div style={{ width: '100%' }}>
197:                     <AgGridReact
198:                         enableCellTextSelection={enableCellTextSelection}
199:                         rowData={data}
200:                         columnDefs={columnDefs}
201:                         gridOptions={defaultGridOptions}
202:                         {...gridOptions}
203:                         pagination={!manualPagination && enablePagination}
204:                         suppressPaginationPanel={manualPagination}
205:                         onGridReady={handleGridReady}
206:                         onSelectionChanged={handleSelectionChanged}
207:                         theme={themeOverride ?? myAgTheme}
208:                     />
209:                 </div>
210:             </div>
211: 
212:             {/* Pagination Footer: Fixed height at bottom */}
213:             {manualPagination && paginationState && onPaginationChange && (
214:                 <div className="flex items-center justify-between px-4 py-3 border-t bg-background shrink-0">
215:                     {/* Left: Total Count */}
216:                     {showTotalCount && (
217:                         <div className="text-sm text-muted-foreground">
218:                             Total: <strong>{rowCount}</strong>
219:                         </div>
220:                     )}
221: 
222:                     {/* Center: Pagination with Page Numbers */}
223:                     <div className="flex items-center gap-1">
224:                         <Button
225:                             variant="outline"
226:                             size="sm"
227:                             onClick={() => handlePageChange(currentPage - 1)}
228:                             disabled={currentPage === 1 || loading}
229:                             className="h-8 w-8 p-0"
230:                         >
231:                             <ChevronLeft className="h-4 w-4" />
232:                         </Button>
233:                         {getPageNumbers().map((page, index) => {
234:                             if (page === '...') {
235:                                 return (
236:                                     <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
237:                                         ...
238:                                     </span>
239:                                 );
240:                             }
241:                             const pageNum = page as number;
242:                             return (
243:                                 <Button
244:                                     key={pageNum}
245:                                     variant={pageNum === currentPage ? "default" : "outline"}
246:                                     size="sm"
247:                                     onClick={() => handlePageChange(pageNum)}
248:                                     disabled={loading}
249:                                     className="h-8 min-w-8 px-2"
250:                                 >
251:                                     {pageNum}
252:                                 </Button>
253:                             );
254:                         })}
255:                         <Button
256:                             variant="outline"
257:                             size="sm"
258:                             onClick={() => handlePageChange(currentPage + 1)}
259:                             disabled={currentPage >= totalPages || loading}
260:                             className="h-8 w-8 p-0"
261:                         >
262:                             <ChevronRight className="h-4 w-4" />
263:                         </Button>
264:                     </div>
265: 
266:                     {/* Right: Length Change */}
267:                     {showLengthChange && (
268:                         <div className="flex items-center gap-2">
269:                             <span className="text-sm text-muted-foreground">Show per Page:</span>
270:                             <Select
271:                                 value={activePageSize.toString()}
272:                                 onValueChange={handlePageSizeChange}
273:                             >
274:                                 <SelectTrigger className="w-20 h-8">
275:                                     <SelectValue />
276:                                 </SelectTrigger>
277:                                 <SelectContent>
278:                                     {pageSizeOptions.map((size) => (
279:                                         <SelectItem key={size} value={size.toString()}>
280:                                             {size}
281:                                         </SelectItem>
282:                                     ))}
283:                                 </SelectContent>
284:                             </Select>
285:                         </div>
286:                     )}
287:                 </div>
288:             )}
289:         </div>
290:     );
291: };
292: 
293: export default DataTable;

(End of file - total 293 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/cheque/ChequeListPage.tsx"
}
```

**Output:**
```
<path>/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/cheque/ChequeListPage.tsx</path>
<type>file</type>
<content>
1: import { paths } from '@/app/routes/paths';
2: import { ExportExcelDropdown } from '@/components/bi-dashboard/ExportExcelDropdown';
3: import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
4: import type { ActionItem } from '@/components/ui/ActionMenu';
5: import { Alert, AlertDescription } from '@/components/ui/alert';
6: import { Badge } from '@/components/ui/badge';
7: import { Button } from '@/components/ui/button';
8: import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
9: import DataTable from '@/components/ui/data-table';
10: import { Input } from '@/components/ui/input';
11: import { QuickFilter } from '@/components/ui/quick-filter';
12: import { Skeleton } from '@/components/ui/skeleton';
13: import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
14: import { useChequeDashboard, useChequeDashboardCounts } from '@/hooks/api/useCheques';
15: import { useBiExport } from '@/hooks/useBiExport';
16: import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
17: import { formatDate } from '@/hooks/useFormatedDate';
18: import { formatINR } from '@/hooks/useINRFormatter';
19: import { chequesService } from '@/services/api/cheques.service';
20: import type { ColDef } from 'ag-grid-community';
21: import { AlertCircle, Calendar, CheckCircle, Clock, Edit, Eye, FileX2, Link, MessageSquare, Plus, Search, Shield, XCircle } from 'lucide-react';
22: import { useCallback, useEffect, useMemo, useState } from 'react';
23: import { useNavigate } from 'react-router-dom';
24: import type { ChequeDashboardRow, ChequeDashboardTab } from './helpers/cheque.types';
25: 
26: const TABS_CONFIG: Array<{ key: ChequeDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
27:     {
28:         key: 'cheque-pending',
29:         name: 'Pending',
30:         icon: <Clock className="h-4 w-4" />,
31:         description: 'Pending cheques',
32:     },
33:     {
34:         key: 'cheque-payable',
35:         name: 'Payable',
36:         icon: <CheckCircle className="h-4 w-4" />,
37:         description: 'Payable cheques',
38:     },
39:     {
40:         key: 'cheque-paid-stop',
41:         name: 'Paid/stop',
42:         icon: <CheckCircle className="h-4 w-4" />,
43:         description: 'Paid or stopped cheques',
44:     },
45:     {
46:         key: 'cheque-for-security',
47:         name: 'For Security',
48:         icon: <Shield className="h-4 w-4" />,
49:         description: 'Cheques for security deposits',
50:     },
51:     {
52:         key: 'cheque-for-dd-fdr',
53:         name: 'For DD/FDR',
54:         icon: <Link className="h-4 w-4" />,
55:         description: 'Cheques for DD/FDR',
56:     },
57:     {
58:         key: 'rejected',
59:         name: 'Rejected',
60:         icon: <XCircle className="h-4 w-4" />,
61:         description: 'Rejected cheques',
62:     },
63:     {
64:         key: 'cancelled',
65:         name: 'Cancelled',
66:         icon: <XCircle className="h-4 w-4" />,
67:         description: 'Cancelled cheques',
68:     },
69:     {
70:         key: 'expired',
71:         name: 'Expired',
72:         icon: <Calendar className="h-4 w-4" />,
73:         description: 'Expired cheques',
74:     }
75: ];
76: 
77: const getStatusVariant = (status: string | null): string => {
78:     if (!status) return 'secondary';
79:     const statusLower = status.toLowerCase();
80:     if (statusLower.includes('created')) {
81:         return 'default';
82:     }
83:     if (statusLower.includes('cancelled') || statusLower.includes('rejected')) {
84:         return 'destructive';
85:     }
86:     return 'secondary';
87: };
88: 
89: const ChequeListPage = () => {
90:     const [activeTab, setActiveTab] = useState<ChequeDashboardTab>('cheque-pending');
91:     const navigate = useNavigate();
92:     const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
93:     const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
94:     const [search, setSearch] = useState<string>('');
95:     const debouncedSearch = useDebouncedSearch(search, 300);
96:     const [teamFilter, setTeamFilter] = useState<string>('All');
97:     const teamId = teamFilter === 'All' ? undefined : teamFilter === 'AC' ? 1 : 2;
98: 
99:     useEffect(() => {
100:         setPagination(p => ({ ...p, pageIndex: 0 }));
101:     }, [activeTab, debouncedSearch, teamFilter]);
102: 
103:     const handlePageSizeChange = useCallback((newPageSize: number) => {
104:         setPagination({ pageIndex: 0, pageSize: newPageSize });
105:     }, []);
106: 
107:     const handleSortChanged = useCallback((event: any) => {
108:         const sortModel = event.api.getColumnState()
109:             .filter((col: any) => col.sort)
110:             .map((col: any) => ({
111:                 colId: col.colId,
112:                 sort: col.sort as 'asc' | 'desc'
113:             }));
114:         setSortModel(sortModel);
115:         setPagination(p => ({ ...p, pageIndex: 0 }));
116:     }, []);
117: 
118:     const flattenFormData = (data: Record<string, any>): Record<string, any> => {
119:         const out: Record<string, any> = {};
120:         if (data.chequeNo) out['Cheque No'] = data.chequeNo;
121:         if (data.chequeDate) out['Cheque Date'] = new Date(data.chequeDate).toLocaleDateString('en-GB');
122:         if (data.dueDate) out['Due Date'] = new Date(data.dueDate).toLocaleDateString('en-GB');
123:         if (data.payeeName) out['Payee Name'] = data.payeeName;
124:         if (data.amount) out['Amount'] = data.amount;
125:         if (data.utr) out['UTR'] = data.utr;
126:         if (data.rejectionReason) out['Rejection Reason'] = data.rejectionReason;
127:         if (data.issueDate) out['Issue Date'] = new Date(data.issueDate).toLocaleDateString('en-GB');
128:         if (data.expiryDate) out['Expiry Date'] = new Date(data.expiryDate).toLocaleDateString('en-GB');
129:         return out;
130:     };
131: 
132:     const { exportTab, setExportTab, exporting, handleExport, exportOptions } = useBiExport({
133:         getAllFn: (params) => chequesService.getAll(params),
134:         getActionFormDataFn: (id) => chequesService.getActionFormData(id),
135:         tabsConfig: TABS_CONFIG,
136:         pendingTabKey: 'cheque-pending',
137:         tabsWithForm: ['cheque-payable', 'cheque-paid-stop', 'cheque-for-security', 'cheque-for-dd-fdr', 'rejected', 'cancelled', 'expired'],
138:         filenamePrefix: 'cheques',
139:         flattenFormData,
140:         mapPendingRow: (r: any) => ({
141:             'Cheque Date': r.cheque ? new Date(r.cheque).toLocaleDateString('en-GB') : '',
142:             'Cheque No': r.chequeNo || '',
143:             'Payee name': r.payeeName || '',
144:             'Requested By': r.requestedBy || '',
145:             'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
146:             'Amount': r.amount || '',
147:             'Type': r.type || '',
148:             'Due Date': r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
149:             'Member': r.requestedBy || '',
150:             'Expiry': r.expiry || '',
151:             'Cheque Status': r.chequeStatus || '',
152:         }),
153:         mapRow: (r: any, isAllTab: boolean) => {
154:             const base: Record<string, any> = {
155:                 'Cheque Date': r.cheque ? new Date(r.cheque).toLocaleDateString('en-GB') : '',
156:                 'Cheque No': r.chequeNo || '',
157:                 'Payee name': r.payeeName || '',
158:                 'Requested By': r.requestedBy || '',
159:                 'Bid Validity': r.bidValidity ? new Date(r.bidValidity).toLocaleDateString('en-GB') : '',
160:                 'Amount': r.amount || '',
161:                 'Type': r.type || '',
162:                 'Due Date': r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '',
163:                 'Member': r.requestedBy || '',
164:                 'Expiry': r.expiry || '',
165:                 'Cheque Status': r.chequeStatus || '',
166:             };
167:             if (isAllTab) base['Tab'] = r._tab || '';
168:             return base;
169:         },
170:     });
171: 
172:     const { data: apiResponse, isLoading, error } = useChequeDashboard({
173:         tab: activeTab,
174:         page: pagination.pageIndex + 1,
175:         limit: pagination.pageSize,
176:         sortBy: sortModel[0]?.colId,
177:         sortOrder: sortModel[0]?.sort,
178:         search: debouncedSearch || undefined,
179:         team: teamId,
180:     });
181: 
182:     const { data: counts } = useChequeDashboardCounts();
183: 
184:     const chequeData = apiResponse?.data || [];
185:     const totalRows = apiResponse?.meta?.total || 0;
186: 
187:     const chequeActions: ActionItem<ChequeDashboardRow>[] = useMemo(
188:         () => [
189:             {
190:                 label: 'View Details',
191:                 icon: <Eye className="h-4 w-4" />,
192:                 onClick: (row: ChequeDashboardRow) => navigate(paths.bi.chequeView(row.requestId)),
193:             },
194:             {
195:                 label: 'Action Form',
196:                 icon: <Edit className="h-4 w-4" />,
197:                 onClick: (row: ChequeDashboardRow) => navigate(paths.bi.chequeAction(row.id)),
198:             },
199:             {
200:                 label: 'Meeting Remarks',
201:                 icon: <MessageSquare className="h-4 w-4" />,
202:                 onClick: (row: ChequeDashboardRow) => navigate(paths.bi.chequeMeetingRemarks(row.id)),
203:             }
204:         ],
205:         [navigate]
206:     );
207: 
208:     const colDefs = useMemo<ColDef<ChequeDashboardRow>[]>(
209:         () => [
210:             {
211:                 field: 'tenderNo',
212:                 colId: 'tenderNo',
213:                 headerName: 'Tender Details',
214:                 width: 200,
215:                 sortable: true,
216:                 filter: true,
217:                 cellRenderer: (params: any) => {
218:                     const data = params.data;
219:                     if (!data) return null;
220:                     if (data.tenderNo) {
221:                         return (
222:                             <div className="flex flex-col gap-0.5">
223:                                 <p className="text-xs">{data.tenderName}</p>
224:                                 <p className="text-xs text-[10px] text-muted-foreground truncate">{data.tenderNo}</p>
225:                             </div>
226:                         );
227:                     }
228:                     return <Badge variant="outline">{data.requestType || '—'}</Badge>;
229:                 },
230:             },
231:             {
232:                 field: 'tenderStatus',
233:                 headerName: 'Tender Status',
234:                 width: 140,
235:                 maxWidth: 130,
236:                 colId: 'tenderStatus',
237:                 valueGetter: (params) => params.data?.tenderStatus || '—',
238:                 sortable: true,
239:                 filter: true,
240:             },
241:             {
242:                 field: 'requestedBy',
243:                 headerName: 'Requested By',
244:                 width: 140,
245:                 maxWidth: 140,
246:                 colId: 'requestedBy',
247:                 valueGetter: (params) => params.data?.requestedBy || '—',
248:                 sortable: true,
249:                 filter: true,
250:             },
251:             {
252:                 field: 'cheque',
253:                 headerName: 'Cheque Date',
254:                 width: 130,
255:                 colId: 'cheque',
256:                 sortable: true,
257:                 valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
258:                 comparator: (dateA, dateB) => {
259:                     if (!dateA && !dateB) return 0;
260:                     if (!dateA) return 1;
261:                     if (!dateB) return -1;
262:                     return new Date(dateA).getTime() - new Date(dateB).getTime();
263:                 },
264:                 hide: activeTab === 'cheque-pending' || activeTab === 'rejected',
265:             },
266:             {
267:                 field: 'chequeNo',
268:                 headerName: 'Cheque No',
269:                 width: 120,
270:                 colId: 'chequeNo',
271:                 valueGetter: (params) => params.data?.chequeNo || '—',
272:                 sortable: true,
273:                 filter: true,
274:                 hide: activeTab === 'cheque-pending' || activeTab === 'rejected',
275:             },
276:             {
277:                 field: 'payeeName',
278:                 headerName: 'Payee name',
279:                 maxWidth: 230,
280:                 colId: 'payeeName',
281:                 valueGetter: (params) => params.data?.payeeName || '—',
282:                 sortable: true,
283:                 filter: true,
284:             },
285:             {
286:                 field: 'bidValidity',
287:                 headerName: 'Bid Validity',
288:                 width: 120,
289:                 maxWidth: 120,
290:                 colId: 'bidValidity',
291:                 sortable: true,
292:                 valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
293:                 comparator: (dateA, dateB) => {
294:                     if (!dateA && !dateB) return 0;
295:                     if (!dateA) return 1;
296:                     if (!dateB) return -1;
297:                     return new Date(dateA).getTime() - new Date(dateB).getTime();
298:                 },
299:             },
300:             {
301:                 field: 'amount',
302:                 headerName: 'Amount',
303:                 width: 100,
304:                 maxWidth: 100,
305:                 colId: 'amount',
306:                 sortable: true,
307:                 filter: true,
308:                 cellRenderer: (params: any) => {
309:                     const amount = params.data?.amount;
310:                     if (!amount) return '—';
311:                     return <span className="text-right">{formatINR(parseFloat(amount.toString()))}</span>;
312:                 },
313:             },
314:             {
315:                 field: 'type',
316:                 headerName: 'Type',
317:                 width: 120,
318:                 maxWidth: 120,
319:                 colId: 'type',
320:                 valueGetter: (params) => params.data?.type || '—',
321:                 sortable: true,
322:                 filter: true,
323:             },
324:             {
325:                 field: 'dueDate',
326:                 headerName: 'Due Date',
327:                 width: 130,
328:                 maxWidth: 130,
329:                 colId: 'dueDate',
330:                 sortable: true,
331:                 valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
332:                 comparator: (dateA, dateB) => {
333:                     if (!dateA && !dateB) return 0;
334:                     if (!dateA) return 1;
335:                     if (!dateB) return -1;
336:                     return new Date(dateA).getTime() - new Date(dateB).getTime();
337:                 },
338:             },
339:             {
340:                 field: 'expiry',
341:                 headerName: 'Expiry',
342:                 width: 120,
343:                 maxWidth: 140,
344:                 colId: 'expiry',
345:                 sortable: true,
346:                 filter: true,
347:                 cellRenderer: (params: any) => {
348:                     const status = params.value;
349:                     if (!status) return '—';
350:                     if (status === 'No date') return <Badge variant="secondary">No date</Badge>;
351:                     if (status === 'Expired') return <Badge variant="destructive">Expired</Badge>;
352:                     return <Badge variant="default">{status}</Badge>;
353:                 },
354:             },
355:             {
356:                 field: 'chequeStatus',
357:                 headerName: 'Cheque Status',
358:                 width: 160,
359:                 maxWidth: 160,
360:                 colId: 'chequeStatus',
361:                 sortable: true,
362:                 filter: true,
363:                 cellRenderer: (params: any) => {
364:                     const status = params.value;
365:                     if (!status) return '—';
366:                     return <Badge variant={getStatusVariant(status) as any}>{status}</Badge>;
367:                 },
368:             },
369:             {
370:                 headerName: '',
371:                 filter: false,
372:                 cellRenderer: createActionColumnRenderer(chequeActions),
373:                 sortable: false,
374:                 pinned: 'right',
375:                 width: 57,
376:             },
377:         ],
378:         [chequeActions, activeTab]
379:     );
380: 
381:     const tabsWithData = useMemo(() => {
382:         return TABS_CONFIG.map((tab) => {
383:             let count = 0;
384:             if (counts) {
385:                 count = counts[tab.key] ?? 0;
386:             }
387:             return {
388:                 ...tab,
389:                 count,
390:             };
391:         });
392:     }, [counts]);
393: 
394:     if (isLoading) {
395:         return (
396:             <Card>
397:                 <CardHeader>
398:                     <Skeleton className="h-8 w-64" />
399:                     <Skeleton className="h-4 w-48 mt-2" />
400:                 </CardHeader>
401:                 <CardContent className="p-6">
402:                     <div className="space-y-4">
403:                         <div className="flex gap-2">
404:                             {TABS_CONFIG.map((_, i) => (
405:                                 <Skeleton key={i} className="h-10 w-36" />
406:                             ))}
407:                         </div>
408:                         <Skeleton className="h-[500px] w-full" />
409:                     </div>
410:                 </CardContent>
411:             </Card>
412:         );
413:     }
414: 
415:     if (error) {
416:         return (
417:             <Card>
418:                 <CardHeader>
419:                     <CardTitle>Cheques Dashboard</CardTitle>
420:                 </CardHeader>
421:                 <CardContent className="p-6">
422:                     <Alert variant="destructive">
423:                         <AlertCircle className="h-4 w-4" />
424:                         <AlertDescription>
425:                             Failed to load cheques. Please try again later.
426:                         </AlertDescription>
427:                     </Alert>
428:                 </CardContent>
429:             </Card>
430:         );
431:     }
432: 
433:     return (
434:         <>
435:             <Card>
436:                 <CardHeader>
437:                     <div className="flex items-center justify-between">
438:                         <div>
439:                             <CardTitle>Cheques Dashboard</CardTitle>
440:                             <CardDescription className="mt-2">
441:                                 Track and manage cheques for tenders.
442:                             </CardDescription>
443:                         </div>
444:                         <CardAction>
445:                             <div className="flex items-center gap-2">
446:                                 <ExportExcelDropdown
447:                                     exportOptions={exportOptions}
448:                                     exportTab={exportTab}
449:                                     setExportTab={setExportTab}
450:                                     exporting={exporting}
451:                                     handleExport={handleExport}
452:                                 />
453:                                 <Button variant="outline" onClick={() => navigate(paths.tendering.oldEmdsForCHEQUE())}>
454:                                     <Plus className="w-4 h-4" />
455:                                     Add Old Entry
456:                                 </Button>
457:                             </div>
458:                         </CardAction>
459:                     </div>
460:                 </CardHeader>
461:                 <CardContent className="px-0">
462:                     <Tabs
463:                         value={activeTab}
464:                         onValueChange={(value) => setActiveTab(value as ChequeDashboardTab)}
465:                     >
466:                         <TabsList className="m-auto mb-4">
467:                             {tabsWithData.map((tab) => (
468:                                 <TabsTrigger
469:                                     key={tab.key}
470:                                     value={tab.key}
471:                                     className="data-[state=active]:shadow-md flex items-center gap-1"
472:                                 >
473:                                     {tab.icon}
474:                                     <span className="font-semibold text-xs">{tab.name}</span>
475:                                     {tab.count > 0 && (
476:                                         <Badge variant="secondary" className="text-xs ml-1">
477:                                             {tab.count}
478:                                         </Badge>
479:                                     )}
480:                                 </TabsTrigger>
481:                             ))}
482:                         </TabsList>
483: 
484:                         {/* Search Row: Quick Filters, Search Bar */}
485:                         <div className="flex items-center gap-4 px-6 pb-4">
486:                             {/* Quick Filters (Left) */}
487:                             <QuickFilter options={[
488:                                 { label: 'AC Team', value: 'AC' },
489:                                 { label: 'DC Team', value: 'DC' },
490:                                 { label: 'All Team', value: 'All' },
491:                             ]}
492:                                 value={teamFilter}
493:                                 onChange={(value) => setTeamFilter(value)}
494:                             />
495: 
496:                             {/* Search Bar (Center) - Flex grow */}
497:                             <div className="flex-1 flex justify-end">
498:                                 <div className="relative">
499:                                     <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
500:                                     <Input
501:                                         type="text"
502:                                         placeholder="Search..."
503:                                         value={search}
504:                                         onChange={(e) => setSearch(e.target.value)}
505:                                         className="pl-8 w-64"
506:                                     />
507:                                 </div>
508:                             </div>
509:                         </div>
510: 
511:                         {tabsWithData.map((tab) => (
512:                             <TabsContent key={tab.key} value={tab.key} className="px-0 m-0 data-[state=inactive]:hidden">
513:                                 {activeTab === tab.key && (
514:                                     <>
515:                                         {(!chequeData || chequeData.length === 0) ? (
516:                                             <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
517:                                                 <FileX2 className="h-12 w-12 mb-4" />
518:                                                 <p className="text-lg font-medium">No {tab.name.toLowerCase()} cheques</p>
519:                                                 <p className="text-sm mt-2">
520:                                                     {tab.description}
521:                                                 </p>
522:                                             </div>
523:                                         ) : (
524:                                             <DataTable
525:                                                 data={chequeData}
526:                                                 columnDefs={colDefs as ColDef<any>[]}
527:                                                 loading={isLoading}
528:                                                 autoSizeColumns={true}
529:                                                 manualPagination={true}
530:                                                 rowCount={totalRows}
531:                                                 paginationState={pagination}
532:                                                 onPaginationChange={setPagination}
533:                                                 onPageSizeChange={handlePageSizeChange}
534:                                                 showTotalCount={true}
535:                                                 showLengthChange={true}
536:                                                 gridOptions={{
537:                                                     defaultColDef: {
538:                                                         editable: false,
539:                                                         filter: true,
540:                                                         sortable: true,
541:                                                         resizable: true,
542:                                                     },
543:                                                     onSortChanged: handleSortChanged,
544:                                                     overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No cheques found</span>',
545:                                                 }}
546:                                             />
547:                                         )}
548:                                     </>
549:                                 )}
550:                             </TabsContent>
551:                         ))}
552:                     </Tabs>
553:                 </CardContent>
554:             </Card>
555:         </>
556:     );
557: };
558: 
559: export default ChequeListPage;

(End of file - total 559 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gyan/workspace/projects/TMS/web/src/hooks/useDebouncedSearch.ts"
}
```

**Output:**
```
<path>/home/gyan/workspace/projects/TMS/web/src/hooks/useDebouncedSearch.ts</path>
<type>file</type>
<content>
1: import { useState, useEffect } from 'react';
2: 
3: /**
4:  * Hook to debounce search input
5:  * @param value - The search value
6:  * @param delay - Delay in milliseconds (default: 300)
7:  * @returns Debounced value
8:  */
9: export function useDebouncedSearch(value: string, delay: number = 300): string {
10:     const [debouncedValue, setDebouncedValue] = useState<string>(value);
11: 
12:     useEffect(() => {
13:         const handler = setTimeout(() => {
14:             setDebouncedValue(value);
15:         }, delay);
16: 
17:         return () => {
18:             clearTimeout(handler);
19:         };
20:     }, [value, delay]);
21: 
22:     return debouncedValue;
23: }

(End of file - total 23 lines)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 4.5s)

_Thinking:_

Now let me look at the tendering pages that already use URL search params for tabs to understand that pattern better, and also look at a similar list page to understand the broader pattern.

Let me also check the tendering page that uses URL-based tabs and look for any existing patterns.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gyan/workspace/projects/TMS/web/src/modules/tendering/emds-tenderfees/EmdListPage.tsx",
  "limit": 120
}
```

**Output:**
```
<path>/home/gyan/workspace/projects/TMS/web/src/modules/tendering/emds-tenderfees/EmdListPage.tsx</path>
<type>file</type>
<content>
1: import { useState, useMemo, useEffect, useCallback } from "react";
2: import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
3: import type { ColDef } from "ag-grid-community";
4: import DataTable from "@/components/ui/data-table";
5: import { formatDateTime } from "@/hooks/useFormatedDate";
6: import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
7: import { CheckCircle, EyeIcon, Pencil, Plus, RefreshCw, Search, Send, Download, XCircle } from "lucide-react";
8: import { Skeleton } from "@/components/ui/skeleton";
9: import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs";
10: import { Badge } from "@/components/ui/badge";
11: import { usePaymentDashboard, usePaymentDashboardCounts } from "@/hooks/api/usePaymentRequests";
12: import { useNavigate, useSearchParams} from "react-router-dom";
13: import { paths } from "@/app/routes/paths";
14: import { Button } from "@/components/ui/button";
15: import { Input } from "@/components/ui/input";
16: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
17: import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
18: import { Textarea } from "@/components/ui/textarea";
19: import type { ActionItem } from "@/components/ui/ActionMenu";
20: import type { PendingTenderRowWithTimer, PaymentRequestRowWithTimer } from "./helpers/payment-request.types";
21: import { currencyCol, tenderNameCol } from "@/components/data-grid";
22: import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
23: import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
24: import { ChangeStatusModal } from "../tenders/components/ChangeStatusModal";
25: import { useTenderingPermissions } from "../hooks/useTenderingPermissions";
26: import { formatINR } from "@/hooks/useINRFormatter";
27: import * as XLSX from 'xlsx';
28: import { saveAs } from 'file-saver';
29: import { demandDraftsService } from '@/services/api/demand-drafts.service';
30: import { fdrsService } from '@/services/api/fdrs.service';
31: import { bankTransfersService } from '@/services/api/bank-transfers.service';
32: import { payOnPortalsService } from '@/services/api/pay-on-portals.service';
33: import { chequesService } from '@/services/api/cheques.service';
34: import { bankGuaranteesService } from '@/services/api/bank-guarantees.service';
35: import { paymentRequestsService } from '@/services/api/payment-requests.service';
36: import { useAuth } from "@/contexts/AuthContext";
37: 
38: const TABS = [
39:     { value: 'pending', label: 'Request Pending' },
40:     { value: 'sent', label: 'Request Sent' },
41:     { value: 'paid', label: 'EMD Paid' },
42:     { value: 'rejected', label: 'Rejected' },
43:     { value: 'returned', label: 'Returned' },
44:     { value: 'fees', label: 'Tender/Processing Fees' },
45:     { value: 'others', label: 'Others' },
46:     { value: 'dnb', label: 'DNB' },
47: ] as const;
48: 
49: type TabValue = typeof TABS[number]['value'];
50: 
51: const STATUS_COLORS: Record<string, string> = {
52:     'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
53:     'Sent': 'bg-blue-100 text-blue-800 border-blue-200',
54:     'Approved': 'bg-green-100 text-green-800 border-green-200',
55:     'Rejected': 'bg-red-100 text-red-800 border-red-200',
56:     'Returned': 'bg-purple-100 text-purple-800 border-purple-200',
57: };
58: 
59: const PURPOSE_COLORS: Record<string, string> = {
60:     'EMD': 'bg-blue-50 text-blue-700 border-blue-200',
61:     'Tender Fee': 'bg-green-50 text-green-700 border-green-200',
62:     'Processing Fee': 'bg-purple-50 text-purple-700 border-purple-200',
63:     'Security Deposit': 'bg-orange-50 text-orange-700 border-orange-200',
64:     'Performance BG': 'bg-cyan-50 text-cyan-700 border-cyan-200',
65:     'Surety Bond': 'bg-pink-50 text-pink-700 border-pink-200',
66:     'Other Payment': 'bg-gray-50 text-gray-700 border-gray-200',
67: };
68: 
69: const INSTRUMENT_LABELS: Record<string, string> = {
70:     'DD': 'Demand Draft',
71:     'FDR': 'Fixed Deposit',
72:     'BG': 'Bank Guarantee',
73:     'Cheque': 'Cheque',
74:     'Bank Transfer': 'Bank Transfer',
75:     'Portal Payment': 'Portal Payment',
76: };
77: 
78: const EmdsAndTenderFeesPage = () => {
79:     const navigate = useNavigate();
80:     const [searchParams] = useSearchParams();
81:     const initialTab = (searchParams.get('tab') as TabValue) || 'pending';
82:     const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
83:     const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
84:     const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
85:     const [search, setSearch] = useState<string>('');
86:     const debouncedSearch = useDebouncedSearch(search, 300);
87:     const [changeStatusModal, setChangeStatusModal] = useState<{ open: boolean; tenderId: number | null; currentStatus?: number | null }>({
88:         open: false,
89:         tenderId: null
90:     });
91:     const { hasTenderingPermission } = useTenderingPermissions();
92:     const [exporting, setExporting] = useState(false);
93:     const { isAdmin, isSuperUser } = useAuth();
94:     const [consentModal, setConsentModal] = useState<{
95:         open: boolean;
96:         row: PaymentRequestRowWithTimer | null;
97:     }>({ open: false, row: null });
98: 
99:     const EXPORT_TAB_OPTIONS = [
100:         { value: 'pending', label: 'Request Pending' },
101:         { value: 'sent', label: 'Request Sent' },
102:         { value: 'paid', label: 'EMD Paid' },
103:         { value: 'rejected', label: 'Rejected' },
104:         { value: 'returned', label: 'Returned' },
105:         { value: 'fees', label: 'Tender/Processing Fees' },
106:         { value: 'others', label: 'Others' },
107:         { value: 'dnb', label: 'DNB' },
108:     ];
109:     const [exportTab, setExportTab] = useState('');
110: 
111:     const getActionFormData = async (instrumentId: number, instrumentType: string): Promise<Record<string, any>> => {
112:         try {
113:             switch (instrumentType) {
114:                 case 'DD': return await demandDraftsService.getActionFormData(instrumentId);
115:                 case 'FDR': return await fdrsService.getActionFormData(instrumentId);
116:                 case 'Bank Transfer': return await bankTransfersService.getActionFormData(instrumentId);
117:                 case 'Portal Payment': return await payOnPortalsService.getActionFormData(instrumentId);
118:                 case 'Cheque': return await chequesService.getActionFormData(instrumentId);
119:                 case 'BG': return await bankGuaranteesService.getActionFormData(instrumentId);
120:                 default: return {};

(Showing lines 1-120 of 915. Use offset=121 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/gyan/workspace/projects/TMS/web/src/modules/tendering/checklists/DocumentChecklistListPage.tsx",
  "limit": 100
}
```

**Output:**
```
<path>/home/gyan/workspace/projects/TMS/web/src/modules/tendering/checklists/DocumentChecklistListPage.tsx</path>
<type>file</type>
<content>
1: import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
2: import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
3: import DataTable from "@/components/ui/data-table";
4: import type { ColDef } from "ag-grid-community";
5: import { useMemo, useState, useEffect, useCallback } from "react";
6: import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
7: import type { ActionItem } from "@/components/ui/ActionMenu";
8: import { useNavigate, useSearchParams } from "react-router-dom";
9: import { paths } from "@/app/routes/paths";
10: import { Skeleton } from "@/components/ui/skeleton";
11: import { Alert, AlertDescription } from "@/components/ui/alert";
12: import { AlertCircle, Eye, FileX2, Search, RefreshCw, Send, XCircle } from "lucide-react";
13: import { Badge } from "@/components/ui/badge";
14: import { Input } from "@/components/ui/input";
15: import { useChecklistDashboardCounts, useDocumentChecklists } from "@/hooks/api/useDocumentChecklists";
16: import type { TenderDocumentChecklistDashboardRow, TenderDocumentChecklistDashboardRowWithTimer } from "./helpers/documentChecklist.types";
17: import { currencyCol, dateCol, tenderNameCol } from "@/components/data-grid";
18: import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
19: import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
20: import { QuickFilter } from "@/components/ui/quick-filter";
21: import { ChangeStatusModal } from "../tenders/components/ChangeStatusModal";
22: import { useTenderingPermissions } from "../hooks/useTenderingPermissions";
23: 
24: const Checklists = () => {
25:     const [searchParams] = useSearchParams();
26:     const initialTab = (searchParams.get("tab") as "pending" | "submitted" | "tender-dnb") || "pending";
27:     const [activeTab, setActiveTab] = useState<"pending" | "submitted" | "tender-dnb">(initialTab);
28:     const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
29:     const [sortModel, setSortModel] = useState<{ colId: string; sort: "asc" | "desc" }[]>([]);
30:     const [search, setSearch] = useState<string>("");
31:     const debouncedSearch = useDebouncedSearch(search, 300);
32:     const navigate = useNavigate();
33:     const [changeStatusModal, setChangeStatusModal] = useState<{ open: boolean; tenderId: number | null; currentStatus?: number | null }>({
34:         open: false,
35:         tenderId: null,
36:     });
37: 
38:     const { hasTenderingPermission } = useTenderingPermissions();
39: 
40:     useEffect(() => {
41:         setPagination(p => ({ ...p, pageIndex: 0 }));
42:     }, [activeTab, debouncedSearch]);
43: 
44:     const handleSortChanged = useCallback((event: any) => {
45:         const sortModel = event.api
46:             .getColumnState()
47:             .filter((col: any) => col.sort)
48:             .map((col: any) => ({
49:                 colId: col.colId,
50:                 sort: col.sort as "asc" | "desc",
51:             }));
52:         setSortModel(sortModel);
53:         setPagination(p => ({ ...p, pageIndex: 0 }));
54:     }, []);
55: 
56:     const handlePageSizeChange = useCallback((newPageSize: number) => {
57:         setPagination({ pageIndex: 0, pageSize: newPageSize });
58:     }, []);
59: 
60:     const { data: counts } = useChecklistDashboardCounts();
61: 
62:     const {
63:         data: apiResponse,
64:         isLoading: loading,
65:         error,
66:     } = useDocumentChecklists(
67:         activeTab,
68:         { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
69:         { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
70:     );
71: 
72:     const tabsData = apiResponse?.data || [];
73:     const totalRows = apiResponse?.meta?.total || 0;
74: 
75:     const checklistActions: ActionItem<TenderDocumentChecklistDashboardRowWithTimer>[] = [
76:         {
77:             label: "Sumbit",
78:             onClick: (row: TenderDocumentChecklistDashboardRow) => {
79:                 if (row.checklistSubmitted) {
80:                     navigate(paths.tendering.documentChecklistEdit(row.tenderId));
81:                 } else {
82:                     navigate(paths.tendering.documentChecklistCreate(row.tenderId));
83:                 }
84:             },
85:             icon: <Send className="h-4 w-4" />,
86:         },
87:         {
88:             label: "View",
89:             onClick: (row: TenderDocumentChecklistDashboardRow) => {
90:                 navigate(paths.tendering.documentChecklistView(row.tenderId));
91:             },
92:             icon: <Eye className="h-4 w-4" />,
93:         },
94:         // {
95:         //     label: 'Mark as Missed',
96:         //     onClick: (row) => {
97:         //         navigate(paths.tendering.bidMissedGlobal(row.tenderId, 'checklist'));
98:         //     },
99:         //     icon: <XCircle className="h-4 w-4" />,
100:         //     visible: () => hasTenderingPermission && activeTab !== 'tender-dnb',

(Showing lines 1-100 of 346. Use offset=101 to continue.)
</content>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "web/src/hooks/use*Table*"
}
```

**Output:**
```
No files found
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 5.3s)

_Thinking:_

Now I have a good understanding. Let me also check the AG Grid documentation to understand if there are built-in state persistence mechanisms. AG Grid actually has a `ColumnState` concept that can be serialized and restored. Let me also check the project for any existing router state or location state usage.

Let me check how `useSearchParams` is used in the tendering pages - do those pages ever write back to the URL? From the analysis, it seems they only read initial tab from URL but don't write back when tab changes. Let me verify.

**Tool: grep**

**Input:**
```json
{
  "pattern": "searchParams\\.set|searchParams\\.delete|setSearchParams",
  "include": "*.tsx",
  "path": "/home/gyan/workspace/projects/TMS/web/src/modules"
}
```

**Output:**
```
No files found
```

**Tool: grep**

**Input:**
```json
{
  "pattern": "localStorage\\.(setItem|getItem|removeItem)",
  "include": "*.ts*",
  "path": "/home/gyan/workspace/projects/TMS/web/src"
}
```

**Output:**
```
Found 25 matches
/home/gyan/workspace/projects/TMS/web/src/lib/auth.ts:
  Line 8:     const raw = localStorage.getItem(AUTH_USER_KEY);

  Line 14:         localStorage.removeItem(AUTH_USER_KEY);

  Line 20:     localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

  Line 24:     localStorage.removeItem(AUTH_USER_KEY);

  Line 32:     const raw = localStorage.getItem(ACTIVE_TEAM_KEY);

  Line 40:         localStorage.removeItem(ACTIVE_TEAM_KEY);

  Line 42:         localStorage.setItem(ACTIVE_TEAM_KEY, String(teamId));

  Line 47:     localStorage.removeItem(ACTIVE_TEAM_KEY);


/home/gyan/workspace/projects/TMS/web/src/lib/axios.ts:
  Line 44:             // localStorage.removeItem('tms_auth_user')


/home/gyan/workspace/projects/TMS/web/src/app/providers/ThemeProvider.tsx:
  Line 30:         () => (localStorage.getItem(storageKey) as Theme) || defaultTheme

  Line 57:             localStorage.setItem(storageKey, theme)


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/cheque/ChequeActionPage.tsx:
  Line 41:             localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));

  Line 47:             const stored = localStorage.getItem(STORAGE_KEY);


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/bank-tranfer/BankTransferActionPage.tsx:
  Line 49:             localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));

  Line 55:             const stored = localStorage.getItem(STORAGE_KEY);


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/fdr/FdrActionPage.tsx:
  Line 41:             localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));

  Line 47:             const stored = localStorage.getItem(STORAGE_KEY);


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/bank-tranfer/components/BankTransferActionForm.tsx:
  Line 190:             localStorage.removeItem('bank_transfer_action_data');


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/fdr/components/FdrActionForm.tsx:
  Line 313:             localStorage.removeItem('fdr_action_data');


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/demand-draft/DemandDraftActionPage.tsx:
  Line 41:             localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));

  Line 47:             const stored = localStorage.getItem(STORAGE_KEY);


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/demand-draft/components/DemandDraftActionForm.tsx:
  Line 288:             localStorage.removeItem('dd_action_data');


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/pay-on-portal/PayOnPortalActionPage.tsx:
  Line 44:             localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));

  Line 50:             const stored = localStorage.getItem(STORAGE_KEY);


/home/gyan/workspace/projects/TMS/web/src/modules/bi-dashboard/pay-on-portal/components/PayOnPortalActionForm.tsx:
  Line 194:             localStorage.removeItem('pay_on_portal_action_data');

```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 34.1s)

_Thinking:_

Good. So the project already uses:
- `localStorage` for auth, theme, BI action form drafts
- `useSearchParams` in tendering pages but only for **reading** initial tab from URL, not for writing back

No existing pages use `useSearchParams()` to write/update URL params.

Now I have enough information to create a comprehensive plan. Let me think about the approach:

## Design Options

### Option A: URL Search Params only
**Store everything (tab, search, page, sort) in URL search params.**

Pros:
- Shareable/bookmarkable URLs
- Free persistence (browser handles it)
- No storage limits
- Works across tabs

Cons:
- Noisy URLs
- Column state (widths) too large for URL
- Need to handle serialization/deserialization

### Option B: localStorage only
**Store all state in localStorage keyed by route path.**

Pros:
- Can store large state (column widths)
- Clean URLs
- Simple API

Cons:
- Not shareable
- Need to manage storage keys
- Potential stale data issues

### Option C: Hybrid (URL + localStorage)
**Tab, search, sort, page → URL search params. Column widths → localStorage.**

This is the most robust approach:
- Navigation-critical state goes in URL (tab, search)
- UI preference state goes in localStorage (column widths)
- Best of both worlds

I'll go with Option C.

## Implementation Plan

### 1. Create a reusable hook: `useUrlTabState` or `usePersistentTableState`

This hook will:
- Accept a config with storage key, default tab value, tabs array
- Return `{ activeTab, setActiveTab, search, setSearch, pagination, setPagination, sortModel, setSortModel, ... }`
- Sync tab, search, page, sort with URL search params
- Sync column state with localStorage
- Handle debounced search

Actually, let me think about this more carefully. The challenge is that the state is scattered:
- `activeTab` → URL param `?tab=`
- `search` → URL param `?q=`
- `pagination.pageIndex` → URL param `?page=`
- `pagination.pageSize` → URL param `?perPage=`
- `sortModel` → URL params `?sortBy=&sortOrder=`
- `teamFilter` → URL param `?team=`
- Column widths → localStorage

But actually, maybe we should keep it simpler. The user's main complaint is about:
1. Search resets
2. Column resize resets
3. Dashboard tab resets

Let me look at what the different pages do. The BI Dashboard pages (cheque, fdr, etc.) all follow the exact same pattern with `activeTab`, `search`, `pagination`, `sortModel`, `teamFilter`. So a reusable hook makes sense.

For tendering pages, some already read tab from URL but don't write it back.

### Approach

**1. Create `usePersistentTableState` hook**

Purpose: Manage and persist table state across navigations.

```tsx
interface PersistentTableStateOptions<Tab extends string> {
  tabKey: string;          // localStorage key prefix for this table
  defaultTab: Tab;
  tabs: readonly Tab[];
  urlPrefix?: string;      // e.g., 'cheque' - used for URL params
  persistColumnState?: boolean; // Whether to persist column widths/order
}

// Returns:
{
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  search: string;
  setSearch: (search: string) => void;
  debouncedSearch: string;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: (pagination: { pageIndex: number; pageSize: number }) => void;
  sortModel: { colId: string; sort: 'asc' | 'desc' }[];
  setSortModel: (sortModel: ...) => void;
  
  // Column state persistence
  columnState: any; // AG Grid column state
  onColumnStateChanged: (event: ColumnStateChangedEvent) => void;
  restoreColumnState: (gridApi: GridApi) => void;
}
```

**2. URL persistence strategy:**
- On mount, read `tab`, `q`, `page`, `perPage`, `sortBy`, `sortOrder` from URL search params
- On state change, update URL via `setSearchParams` (using `replace: true` or not? probably `replace: true` to avoid polluting history)
- Use `useSearchParams` from react-router-dom

**3. localStorage persistence for column state:**
- Use AG Grid's `getColumnState()` to serialize column state
- Store in localStorage with key like `table-column-state:{routeKey}:{tab}`
- On `gridReady`, restore column state via `api.applyColumnState()`

**4. Migration path:**
- Update DataTable component to support column state persistence props
- Update all 7 BI dashboard list pages to use the new hook  
- Update tendering pages that already read from URL to also write back

Let me think about the scope. The user asked specifically about the BI Dashboard scenario. Should I focus just on BI Dashboard or generalize?

If I generalize, the `DataTable` component needs to change to support column state save/restore. The individual pages need to use the new hook. This is a significant but systematic change.

Actually, let me re-read the user's message: "see the DataTable lib used in this project, and plan that how can we persist the search, column resized, dashboard tab changed for users."

So they want me to plan a solution. Let me present a clear plan.

### Detailed Plan

#### Phase 1: Create `usePersistentTableState` hook

```tsx
// web/src/hooks/usePersistentTableState.ts

interface PersistentTableStateOptions<Tab extends string> {
  storageKey: string;
  defaultTab: Tab;
  tabs?: readonly Tab[];
  enableColumnPersistence?: boolean;
  defaultPageSize?: number;
}

interface PersistentTableState<Tab extends string> {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  search: string;
  setSearch: (search: string) => void;
  debouncedSearch: string;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>;
  handleSortChanged: (event: any) => void;
  handlePageSizeChange: (pageSize: number) => void;
  sortModel: { colId: string; sort: 'asc' | 'desc' }[];
  // Column state
  saveColumnState: (gridApi: any) => void;
  restoreColumnState: (gridApi: any) => void;
}
```

The hook:
1. Uses `useSearchParams()` from react-router-dom
2. On mount, reads `tab`, `q`, `page`, `size`, `sortBy`, `sortOrder` from URL
3. On state changes, updates URL params via `setSearchParams` (with `replace` to avoid history bloat)
4. Uses `useDebouncedSearch` internally
5. For column state, uses `localStorage` with key `table-columns-{storageKey}-{tab}`
6. Returns `saveColumnState(gridApi)` and `restoreColumnState(gridApi)` functions

#### Phase 2: Update DataTable component

Add props for column state management:
```tsx
columnState?: Record<string, any>;
onColumnStateChanged?: (columnState: Record<string, any>) => void;
```

In the `DataTable`, add event handlers:
- `onColumnResized` → call `onColumnStateChanged` with current column state
- `onColumnMoved` → call `onColumnStateChanged` with current column state
- On `gridReady`, apply saved column state if provided

Wait, actually. Looking at the DataTable more carefully... the column state management should probably be done at the page level, not inside the DataTable component, to keep the DataTable generic. But we can still add hooks/events.

Actually, a simpler approach: just add `onGridReady` that the page can use to restore column state, and add `onColumnResized` / `onColumnMoved` events in gridOptions that the page uses to save column state.

#### Phase 3: Update BI Dashboard pages

For each BI dashboard list page (cheque, fdr, bank-guarantee, etc.):
- Replace individual `useState` calls with `usePersistentTableState`
- Replace `useDebouncedSearch` with the debounced search from the hook
- Pass `saveColumnState`/`restoreColumnState` to DataTable via gridOptions
- Initialize tab from URL params instead of hardcoded default
- Write tab changes back to URL params

#### Phase 4: Update tendering pages (optional but good)

Update pages like `EmdListPage`, `DocumentChecklistListPage` to:
- Write tab changes to URL via `useSearchParams`
- Maybe also persist search/column state

Let me think about what the actual localStorage keys would look like:

For the cheque dashboard, the key might be something like:
- `table-columns:cheque-dashboard:cheque-pending`
- `table-columns:cheque-dashboard:cheque-payable` 
- etc.

This way, column state is preserved per tab, which is important since different tabs may show different columns.

Actually, I should also think about whether `teamFilter` (the QuickFilter AC/DC/All) should also be persisted. Probably yes.

Let me refine the plan and present it to the user.

One more thing - let me check how many pages would need to change. The user specifically asked about BI Dashboard. Let me not over-scope this.

The user said: "Currently when I search then view the details (etc) via action menu and come back on dashboard then tab and search reset already"

So the three specific things:
1. Search - resets
2. Column resize - resets  
3. Dashboard tab - resets

Let me present a focused plan.

Now I have a complete picture. Here's my analysis and plan:

---

## Analysis

**Library**: AG Grid (`ag-grid-community` + `ag-grid-react` v34.1.2)

**State that's lost on navigation** (all local `useState`, destroyed on unmount):

| State | Where stored | Example page |
|-------|-------------|--------------|
| `activeTab` | `useState` only | `ChequeListPage.tsx:90` |
| `search` | `useState` + `useDebouncedSearch` | `ChequeListPage.tsx:94` |
| `pagination` (pageIndex, pageSize) | `useState` | `ChequeListPage.tsx:92` |
| `sortModel` | `useState` | `ChequeListPage.tsx:93` |
| `teamFilter` | `useState` | `ChequeListPage.tsx:96` |
| Column widths | AG Grid internal only (no persistence) | `data-table.tsx` |

**Existing persistence patterns** in the project:
- `localStorage` — auth, theme, BI action form drafts (already established pattern)
- `useSearchParams` — tendering pages *read* initial tab from URL but **never write back**
- **No pages currently write state back to URL**

---

## Plan: Hybrid URL + localStorage Persistence

### Strategy

- **Tab, search, page, sort, team filter** → URL search params (`?tab=&q=&page=&sortBy=&sortOrder=&team=`)
- **Column widths/order** → `localStorage` (too large/noisy for URL, and it's a personal preference, not navigation state)

### Implementation Steps

#### Step 1: Create `usePersistentTableState` hook

New file: `web/src/hooks/usePersistentTableState.ts`

Synopsis:
- Takes `storageKey` (route-specific), `defaultTab`, `defaultPageSize`
- Reads initial state from `useSearchParams()` on mount
- Writes all state changes back to URL via `setSearchParams({replace: true})`
- Exposes `saveColumnState(api)` / `restoreColumnState(api)` that reads/writes localStorage under key `tms:cols:{storageKey}:{tab}`
- Internally uses `useDebouncedSearch` so no separate hook needed
- Resets page to 0 when tab, search, or team filter changes (same as current behavior)

Signature:
```ts
function usePersistentTableState<Tab extends string>(config: {
  storageKey: string;
  defaultTab: Tab;
  defaultPageSize?: number;
}): {
  activeTab: Tab; setActiveTab: (t: Tab) => void;
  search: string; setSearch: (s: string) => void; debouncedSearch: string;
  teamFilter: string; setTeamFilter: (t: string) => void;
  pagination: { pageIndex: number; pageSize: number }; setPagination: ...;
  sortModel: ...; handleSortChanged: (event) => void; handlePageSizeChange: (n) => void;
  saveColumnState: (gridApi) => void;
  restoreColumnState: (gridApi) => void;
}
```

#### Step 2: Update `DataTable` component

Add two new props:
- `onColumnStateChanged?: (columnState: any[]) => void`
- `enableColumnStatePersistence?: boolean`

Wire `onColumnResized` and `onColumnMoved` events in `gridOptions` to call `onColumnStateChanged`. When `gridReady` fires, give the parent a chance to restore column state (via the existing `onGridReady` callback).

#### Step 3: Update BI Dashboard pages (7 files)

Each page like `ChequeListPage.tsx`:
- Replace `useState` for `activeTab`, `search`, `pagination`, `sortModel`, `teamFilter` with `usePersistentTableState`
- Remove standalone `useDebouncedSearch`
- Wire `saveColumnState` to `onColumnResized` / `onColumnMoved` via gridOptions
- Wire `restoreColumnState` to `onGridReady`
- Add `useEffect` to update URL when tab changes (or let the hook do it)

Files to modify:
1. `web/src/modules/bi-dashboard/cheque/ChequeListPage.tsx`
2. `web/src/modules/bi-dashboard/bank-guarantee/BankGuaranteeListPage.tsx`
3. `web/src/modules/bi-dashboard/fdr/FdrListPage.tsx`
4. `web/src/modules/bi-dashboard/pay-on-portal/PayOnPortalListPage.tsx`
5. `web/src/modules/bi-dashboard/bank-tranfer/BankTransferListPage.tsx`
6. `web/src/modules/bi-dashboard/demand-draft/DemandDraftListPage.tsx`
7. `web/src/modules/bi-dashboard/tender-fee/TenderFeeListPage.tsx`

#### Step 4 (optional follow-up): Update tendering pages

The ~10 tendering pages that already read `?tab=` from URL but don't write back can also be updated to use the same hook for consistent behavior.

---

### Navigation Flow After Change

```
User on ChequeListPage (tab=payable, search="ABC Corp", page=2)
  URL: /bi-dashboard/cheque?tab=cheque-payable&q=ABC+Corp&page=2&sortBy=amount&sortOrder=desc&team=AC
  localStorage: tms:cols:cheque-dashboard:cheque-payable = [{colId:"tenderNo",width:220}, ...]

  ↓ Click "View Details" → navigate(/bi-dashboard/cheque/details/123)

User on ChequeDetailsPage
  URL: /bi-dashboard/cheque/details/123

  ↓ Click "Back" → navigate(/bi-dashboard/cheque)

User returns to ChequeListPage
  Hook reads URL → restores tab, search, page, sort, team
  Hook reads localStorage → restores column widths/order
  API fires with restored params → exact same view as before
```

---

### Questions for you:

1. **URL param or sessionStorage for tab/search/page?** — I recommend URL params because they're bookmarkable/debuggable and you already have the pattern in tendering pages. But if you prefer clean URLs, we could use `sessionStorage` instead (which auto-clears on tab close).

2. **Write to URL with `replace` or `push`?** — I'd suggest `replace: true` so that the user doesn't get dozens of history entries just from typing in the search box.

3. **Should we also persist the QuickFilter (AC/DC/All team toggle)?** — It's currently also lost on navigation.

4. **Should tendering pages be included in scope?** — They already partially read from URL. Updating them to write back would be relatively small incremental work.

---

