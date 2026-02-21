import { useNavigate } from 'react-router-dom';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { ClipboardList, Eye, FileX2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import { getRfqResponseListColumnDefs } from '../helpers/rfqResponseListColDefs';
import type { RfqResponseListItem } from '../helpers/rfq.types';

export interface RfqResponsesTableProps {
    responses: RfqResponseListItem[];
    isLoading?: boolean;
    /** When set, shows Record Receipt action and optional empty-state CTA */
    rfqId?: number | null;
}

export function RfqResponsesTable({ responses, isLoading = false, rfqId }: RfqResponsesTableProps) {
    const navigate = useNavigate();

    const responseActions = useMemo<ActionItem<RfqResponseListItem>[]>(() => {
        const actions: ActionItem<RfqResponseListItem>[] = [
            {
                label: 'View',
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: RfqResponseListItem) => navigate(paths.tendering.rfqResponseView(row.id)),
            },
        ];
        if (rfqId != null) {
            actions.push({
                label: 'Record Receipt',
                icon: <ClipboardList className="h-4 w-4" />,
                onClick: (row: RfqResponseListItem) => navigate(paths.tendering.rfqsResponseNew(row.rfqId)),
            });
        }
        return actions;
    }, [navigate, rfqId]);

    const colDefs = useMemo(
        () => getRfqResponseListColumnDefs(responseActions),
        [responseActions]
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Loading responses…
            </div>
        );
    }

    if (responses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileX2 className="h-10 w-10 mb-3" />
                <p className="font-medium">No responses yet</p>
                {rfqId != null && (
                    <Button
                        className="mt-3"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(paths.tendering.rfqsResponseNew(rfqId))}
                    >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Record Receipt
                    </Button>
                )}
            </div>
        );
    }

    return (
        <DataTable
            data={responses}
            columnDefs={colDefs as ColDef<RfqResponseListItem>[]}
            loading={false}
            manualPagination={false}
            enablePagination={responses.length > 10}
            pageSize={25}
            showTotalCount={true}
            showLengthChange={true}
            gridOptions={{
                defaultColDef: {
                    editable: false,
                    filter: true,
                    sortable: true,
                    resizable: true,
                },
                overlayNoRowsTemplate:
                    '<span style="padding: 10px; text-align: center;">No responses found</span>',
            }}
        />
    );
}
