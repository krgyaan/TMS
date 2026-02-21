import type { ColDef } from 'ag-grid-community';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { dateCol, tenderNameCol } from '@/components/data-grid';
import type { RfqResponseListItem } from './rfq.types';

export function getRfqResponseListColumnDefs(
    responseActions: ActionItem<RfqResponseListItem>[]
): ColDef<RfqResponseListItem>[] {
    return [
        tenderNameCol<RfqResponseListItem>('tenderNo', {
            headerName: 'TENDER',
            filter: true,
            width: 250,
            colId: 'tenderNo',
            sortable: true,
        }),
        {
            field: 'itemSummary',
            headerName: 'ITEM',
            width: 200,
            colId: 'itemSummary',
            valueGetter: (params) => params.data?.itemSummary ?? '—',
            sortable: true,
            filter: true,
            wrapText: true,
            autoHeight: true,
        },
        {
            field: 'vendorName',
            headerName: 'VENDOR NAME',
            width: 180,
            colId: 'vendorName',
            valueGetter: (params) => params.data?.vendorName ?? '—',
            sortable: true,
            filter: true,
        },
        dateCol<RfqResponseListItem>('dueDate', {
            headerName: 'TENDER DUE DATE & TIME',
            width: 200,
            colId: 'dueDate',
        }),
        dateCol<RfqResponseListItem>('receiptDatetime', {
            headerName: 'RECEIPT DATE & TIME',
            width: 200,
            colId: 'receiptDatetime',
        }),
        {
            headerName: '',
            filter: false,
            cellRenderer: createActionColumnRenderer(responseActions),
            sortable: false,
            pinned: 'right',
            width: 57,
        },
    ];
}
