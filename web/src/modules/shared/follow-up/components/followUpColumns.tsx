import type { ColDef } from "ag-grid-community";
import { Eye, FileEdit, RefreshCw, Trash, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { currencyCol, dateOnlyCol } from "@/components/data-grid";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { ContactPerson, FollowUpListRow } from "../helpers/followUp.types";

interface CreateFollowUpColumnsArgs {
    onView: (row: FollowUpListRow) => void;
    onEdit: (row: FollowUpListRow) => void;
    onUpdateStatus: (row: FollowUpListRow) => void;
    onViewContacts: (contacts: ContactPerson[]) => void;
    onDelete: (row: FollowUpListRow) => void;
    canDelete: boolean;
}

export function createFollowUpColumns({
    onView,
    onEdit,
    onUpdateStatus,
    onViewContacts,
    onDelete,
    canDelete,
}: CreateFollowUpColumnsArgs): ColDef<FollowUpListRow>[] {
    const actions: ActionItem<FollowUpListRow>[] = [
        {
            label: "Auto Followup",
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: row => onEdit(row),
        },
        {
            label: "Update Status",
            icon: <FileEdit className="h-4 w-4" />,
            onClick: row => onUpdateStatus(row),
        },
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: row => onView(row),
        },
        {
            label: "Delete",
            icon: <Trash className="h-4 w-4" />,
            onClick: row => onDelete(row),
            className: "text-destructive",
            visible: () => canDelete,
        },
    ];

    return [
        {
            field: "partyName",
            colId: "partyName",
            headerName: "Organisation",
            flex: 1,
            minWidth: 180,
            cellClass: "font-medium",
        },
        {
            field: "area",
            colId: "area",
            headerName: "Area",
            width: 120,
        },
        {
            field: "contacts",
            headerName: "Contacts",
            width: 110,
            sortable: false,
            filter: false,
            cellRenderer: (params: { data?: FollowUpListRow }) => {
                const contacts = params.data?.contacts ?? [];
                if (contacts.length === 0) {
                    return <span className="text-muted-foreground">—</span>;
                }
                return (
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        onClick={() => onViewContacts(contacts)}
                    >
                        <Users className="h-3.5 w-3.5" />
                        {contacts.length}
                    </button>
                );
            },
        },
        currencyCol<FollowUpListRow>("amount", {
            headerName: "Amount",
            width: 140,
            cellClass: "font-medium tabular-nums",
        }),
        {
            field: "frequencyLabel",
            colId: "frequency",
            headerName: "Frequency",
            width: 150,
            cellRenderer: (params: { value?: string | number; data?: FollowUpListRow }) => {
                const isStopped = params.data?.frequency === 6;
                return (
                    <Badge variant={isStopped ? "destructive" : "secondary"} className="font-normal">
                        {params.value ?? "—"}
                    </Badge>
                );
            },
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            cellRenderer: (params: { value?: string }) => (
                <Badge variant="outline" className="font-normal">
                    {params.value ?? "—"}
                </Badge>
            ),
        },
        {
            field: "latestComment",
            headerName: "Last Comment",
            flex: 1,
            minWidth: 180,
            cellRenderer: (params: { value?: string | null }) => (
                <span className="block truncate text-sm text-muted-foreground">{params.value || "—"}</span>
            ),
        },
        {
            field: "assignee.name",
            headerName: "Assigned To",
            width: 140,
            sortable: false,
            valueGetter: params => params.data?.assignee?.name ?? "—",
        },
        {
            field: "creator.name",
            headerName: "Assigned By",
            width: 140,
            sortable: false,
            valueGetter: params => params.data?.creator?.name ?? "—",
        },
        dateOnlyCol<FollowUpListRow>("startFrom", {
            headerName: "Start Date",
            width: 130,
        }),
        dateOnlyCol<FollowUpListRow>("updatedAt", {
            headerName: "Last Update",
            width: 130,
        }),
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            pinned: "right",
            width: 90,
            cellRenderer: createActionColumnRenderer(actions),
        },
    ];
}
