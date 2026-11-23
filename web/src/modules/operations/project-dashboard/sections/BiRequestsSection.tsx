import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectBiRequests } from "@/hooks/api/usePaymentRequests";
import { formatINR } from "@/hooks/useINRFormatter";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { ChevronDown, Eye, Plus } from "lucide-react";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface BiInstrumentRow {
    id: number;
    instrumentType: string;
    purpose: string | null;
    amount: string;
    status: string;
    fdrNo?: string | null;
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

const BG_STATUS_LABELS: Record<string, string> = {
    PENDING: "Pending",
    ACCOUNTS_FORM_ACCEPTED: "Format Accepted",
    ACCOUNTS_FORM_REJECTED: "Rejected",
    BG_CREATED: "Created",
    FDR_DETAILS_CAPTURED: "SFMS Submitted",
    FOLLOWUP_INITIATED: "Followup Initiated",
    EXTENSION_REQUESTED: "Extension Request",
    RETURN_VIA_COURIER: "Returned via courier",
    CANCELLATION_REQUESTED: "Cancellation Request",
    BG_CANCELLATION_CONFIRMED: "BG Cancelled",
    FDR_CANCELLED_CONFIRMED: "FDR released",
    RETURNED_VIA_COURIER: "Returned via courier",
    BG_CANCELLED: "BG Cancelled",
    FDR_CANCELLED: "FDR released",
};

const FDR_STATUS_LABELS: Record<string, string> = {
    PENDING: "Pending",
    ACCOUNTS_FORM_REJECTED: "FDR Rejected",
    FOLLOWUP_INITIATED: "Followup Initiated",
    RETURN_VIA_COURIER: "Returned via courier",
    RETURN_VIA_BANK_TRANSFER: "Returned via Bank Transfer",
    SETTLED_WITH_PROJECT: "Settled with Project Account",
    CANCELLATION_REQUESTED: "FDR Cancellation request sent to branch",
    CANCELLED: "FDR Cancelled at Branch",
};

const titleCaseStatus = (status: string) =>
    status
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

const formatStatusLabel = (status?: string | null, instrumentType?: string | null) => {
    if (!status) return "-";
    const label = instrumentType === "BG" ? BG_STATUS_LABELS[status] : undefined;
    return label ?? titleCaseStatus(status);
};

const formatFdrStatus = (status?: string | null, fdrNo?: string | null) => {
    if (!status) return "-";
    if (status === "ACCOUNTS_FORM_ACCEPTED") {
        return fdrNo ? "FDR Created" : "FDR Accepted";
    }
    return FDR_STATUS_LABELS[status] ?? titleCaseStatus(status);
};

const formatInstrumentStatus = (instrument?: BiInstrumentRow | null) => {
    if (!instrument) return "-";
    if (instrument.instrumentType === "FDR") {
        return formatFdrStatus(instrument.status, instrument.fdrNo);
    }
    return formatStatusLabel(instrument.status, instrument.instrumentType);
};

const pickInstrument = (row?: BiRequestRow | null): BiInstrumentRow | null =>
    row?.instruments?.find((instrument) => instrument.instrumentType === "FDR")
    ?? row?.instruments?.[0]
    ?? null;

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
            valueGetter: (p) => pickInstrument(p.data)?.instrumentType || "-",
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
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 150,
            valueGetter: (p) => {
                const instrument = pickInstrument(p.data);
                return instrument
                    ? formatInstrumentStatus(instrument)
                    : formatStatusLabel(p.data?.status);
            },
        },
        {
            field: "createdAt",
            headerName: "Request Date",
            sortable: true,
            width: 140,
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
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => navigate(paths.operations.biRequestBgCreate(projectId))}
                                    >
                                        Bank Guarantee
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => navigate(paths.operations.biRequestFdrCreate(projectId))}
                                    >
                                        FDR
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
