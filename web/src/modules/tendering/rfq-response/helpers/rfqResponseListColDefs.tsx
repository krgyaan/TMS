import type { ColDef } from 'ag-grid-community';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { dateCol, tenderNameCol } from '@/components/data-grid';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RfqResponseListItem } from './rfqResponse.types';

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
            cellRenderer: (params: any) => {
                const text = params.data?.itemSummary ?? '—';
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block">{text}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] whitespace-pre-wrap">
                            {text}
                        </TooltipContent>
                    </Tooltip>
                );
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'vendorName',
            headerName: 'VENDOR',
            width: 180,
            colId: 'vendorName',
            cellRenderer: (params: any) => {
                const name = params.data?.vendorName ?? '—';
                return (
                    <Badge variant="secondary" className="font-medium">
                        {name}
                    </Badge>
                );
            },
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
