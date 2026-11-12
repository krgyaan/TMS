import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectBiRequests } from "@/hooks/api/usePaymentRequests";
import { formatINR } from "@/hooks/useINRFormatter";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { Banknote, ChevronDown, Eye, Plus } from "lucide-react";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface BiInstrumentRow {
    id: number;
    instrumentType: string;
    purpose: string | null;
    amount: string;
    status: string;
}

interface BiRequestRow {
    id: number;
    tenderNo: string;
    projectName: string | null;
    purpose: string;
    amountRequired: string;
    status: string | null;
    createdAt: string | null;
    instruments: BiInstrumentRow[];
}

interface BiRequestsSectionProps {
    projectId: number | null;
}

export const BiRequestsSection: React.FC<BiRequestsSectionProps> = ({ projectId }) => {
    const navigate = useNavigate();
    const { data, isLoading } = useProjectBiRequests(projectId ?? 0);

    const requests = useMemo<BiRequestRow[]>(
        () => (data?.requests ?? []) as BiRequestRow[],
        [data],
    );

    const actions = useMemo<ActionItem<BiRequestRow>[]>(() => [
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.biRequestView(projectId!, row.id)),
        },
    ], [navigate]);

    const columns = useMemo<ColDef<BiRequestRow>[]>(() => [
        {
            field: "tenderNo",
            headerName: "Reference No.",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 160,
            valueFormatter: (p: ValueFormatterParams<BiRequestRow>) => p.value || "-",
        },
        {
            field: "projectName",
            headerName: "Project / Work",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 160,
            valueFormatter: (p: ValueFormatterParams<BiRequestRow>) => p.value || "-",
        },
        {
            headerName: "Instrument",
            sortable: false,
            filter: false,
            width: 130,
            valueGetter: (p) => p.data?.instruments?.[0]?.instrumentType || "-",
        },
        {
            field: "purpose",
            headerName: "Purpose",
            sortable: true,
            filter: true,
            width: 150,
            valueFormatter: (p: ValueFormatterParams<BiRequestRow>) => p.value || "-",
        },
        {
            field: "amountRequired",
            headerName: "Amount",
            sortable: true,
            width: 140,
            valueFormatter: (p: ValueFormatterParams<BiRequestRow>) => formatINR(Number(p.value || 0)),
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 120,
            valueFormatter: (p: ValueFormatterParams<BiRequestRow>) => p.value || "Pending",
        },
        {
            field: "createdAt",
            headerName: "Created",
            sortable: true,
            width: 130,
            valueFormatter: (p: ValueFormatterParams<BiRequestRow>) =>
                p.value ? new Date(p.value).toLocaleDateString() : "-",
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<BiRequestRow>(actions),
            width: 80,
            pinned: "right" as "right" | "left",
        },
    ], [actions]);

    if (!projectId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="w-full">
                    <div className="flex justify-between items-center gap-2">
                        <CardTitle className="text-base font-semibold">
                            BI Requests
                        </CardTitle>
                        <CardAction>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="default">
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        Request BI
                                        <ChevronDown className="ml-1.5 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuLabel>Select BI Type</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled>
                                        <Banknote className="mr-2 h-4 w-4" />
                                        FDR
                                        <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled>
                                        <Banknote className="mr-2 h-4 w-4" />
                                        Cheque
                                        <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate(paths.operations.biRequestBgCreate(projectId))}>
                                        <Banknote className="mr-2 h-4 w-4" />
                                        Bank Guarantee
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardAction>
                    </div>
                    <CardDescription>
                        {requests.length} request{requests.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DataTable
                    data={requests}
                    columnDefs={columns}
                    gridOptions={{
                        pagination: true,
                        paginationPageSize: 10,
                        domLayout: 'autoHeight',
                    }}
                />
            </CardContent>
        </Card>
    );
};
