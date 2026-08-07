import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
    Eye,
    ReceiptText,
    Banknote,
    PhoneCall,
    Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { useAmcBillings, useAmcBillingFollowup } from "@/hooks/api/useAmcBilling";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AmcBillDetail } from "@/modules/services/amc/helpers/amc.types";
import { INVOICE_DEADLINE_HOURS } from "@/modules/services/amc/helpers/amc.types";
import { ManageInvoicesModal } from "./components/ManageInvoicesModal";
import { ManageReceiptsModal } from "./components/ManageReceiptsModal";

const STATUS_STYLES: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-800 border-amber-200",
    "Bill Submitted": "bg-blue-100 text-blue-800 border-blue-200",
    "Payment Received": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Follow-up": "bg-orange-100 text-orange-800 border-orange-200",
};

const fmtDate = (value?: string | null) =>
    value ? format(new Date(`${value}T00:00:00`), "MMM d, yyyy") : "—";

function pad(value: number) {
    return String(value).padStart(2, "0");
}

function TimerCell({ billDueDate, stopped }: { billDueDate: string | null; stopped: boolean }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (stopped || !billDueDate) {
        return <span className="text-muted-foreground">—</span>;
    }

    const deadline = new Date(`${billDueDate}T00:00:00`).getTime() + INVOICE_DEADLINE_HOURS * 3600 * 1000;
    const remaining = deadline - now;

    if (remaining <= 0) {
        return <span className="font-medium text-red-600">Overdue</span>;
    }

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    const color = remaining < 6 * 3600 * 1000 ? "text-amber-600" : "text-emerald-600";

    return (
        <span className={cn("font-medium tabular-nums", color)}>
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
    );
}

function ContactCell({ row }: { row: AmcBillDetail }) {
    const contact = row.site?.contacts?.[0];

    if (!contact) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <div className="flex flex-col">
            <span className="font-medium">{contact.name}</span>
            <span className="text-xs text-muted-foreground">{contact.mobile}</span>
        </div>
    );
}

export default function AmcBillingListPage() {
    const navigate = useNavigate();
    const { data: bills = [], isLoading } = useAmcBillings();
    const followup = useAmcBillingFollowup();

    const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; id: number | null }>({
        open: false,
        id: null,
    });
    const [receiptModal, setReceiptModal] = useState<{ open: boolean; id: number | null }>({
        open: false,
        id: null,
    });

    const rows = useMemo(() => bills, [bills]);

    const actions: ActionItem<AmcBillDetail>[] = [
        {
            label: "Manage Invoices",
            onClick: row => setInvoiceModal({ open: true, id: row.id }),
            icon: <ReceiptText className="h-4 w-4" />,
        },
        {
            label: "Manage Receipts",
            onClick: row => setReceiptModal({ open: true, id: row.id }),
            icon: <Banknote className="h-4 w-4" />,
        },
        {
            label: "Initiate Followup",
            onClick: row => followup.mutate(row.id),
            icon: <PhoneCall className="h-4 w-4" />,
        },
        {
            label: "View",
            onClick: row => navigate(paths.services.amcBillingShow(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const [colDefs] = useState<ColDef<AmcBillDetail>[]>(() => [
        {
            colId: "projectName",
            headerName: "Project Name",
            width: 230,
            valueGetter: params => params.data?.amc?.projectName ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <span>{params.data?.amc?.projectName ?? "—"}</span>
            ),
        },
        {
            colId: "siteName",
            headerName: "Site Name",
            width: 160,
            valueGetter: params => params.data?.site?.name ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <span>{params.data?.site?.name ?? "—"}</span>
            ),
        },
        {
            colId: "contactDetails",
            headerName: "Contact details",
            width: 190,
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <ContactCell row={params.data!} />
            ),
        },
        {
            colId: "billNo",
            headerName: "Bill No.",
            width: 90,
            valueGetter: params => params.data?.billNo ?? "—",
        },
        {
            colId: "billDueDate",
            headerName: "Billing Due date",
            width: 140,
            sort: "asc",
            valueGetter: params => params.data?.billDueDate ?? "",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <span className={cn(!params.data?.billDueDate && "text-muted-foreground")}>
                    {fmtDate(params.data?.billDueDate ?? null)}
                </span>
            ),
        },
        {
            colId: "amount",
            headerName: "Amount (Pre GST)",
            width: 130,
            valueGetter: params => params.data?.amount ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <span>{params.data?.amount ?? "—"}</span>
            ),
        },
        {
            colId: "serviceEngineer",
            headerName: "Service Engg Name",
            width: 170,
            valueGetter: params => params.data?.amc?.serviceEngineers?.[0]?.name ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <span>{params.data?.amc?.serviceEngineers?.[0]?.name ?? "—"}</span>
            ),
        },
        {
            colId: "teamName",
            headerName: "TE Name",
            width: 100,
            valueGetter: params => params.data?.amc?.teamName ?? "—",
        },
        {
            colId: "status",
            headerName: "Status",
            width: 150,
            valueGetter: params => params.data?.status ?? "",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => {
                const value = params.data?.status ?? "";
                return (
                    <Badge
                        variant="outline"
                        className={cn(
                            "font-medium",
                            STATUS_STYLES[value] ?? "bg-muted text-muted-foreground border-transparent",
                        )}
                    >
                        {value || "—"}
                    </Badge>
                );
            },
        },
        {
            colId: "invoices",
            headerName: "Invoices",
            width: 110,
            valueGetter: params => params.data?.invoices?.length ?? 0,
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => {
                const count = params.data?.invoices?.length ?? 0;
                if (count === 0) return <span className="text-muted-foreground">—</span>;
                return (
                    <Badge variant="secondary" className="cursor-pointer">
                        {count}
                    </Badge>
                );
            },
        },
        {
            colId: "receipts",
            headerName: "Receipts",
            width: 110,
            valueGetter: params => params.data?.paymentReceipts?.length ?? 0,
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => {
                const count = params.data?.paymentReceipts?.length ?? 0;
                if (count === 0) return <span className="text-muted-foreground">—</span>;
                return (
                    <Badge variant="secondary" className="cursor-pointer">
                        {count}
                    </Badge>
                );
            },
        },
        {
            colId: "timer",
            headerName: "Invoice Timer",
            width: 120,
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => {
                const hasPendingServices = params.data?.services?.some(s => s.status !== "Done") ?? false;
                return (
                    <TimerCell
                        billDueDate={params.data?.billDueDate ?? null}
                        stopped={!hasPendingServices}
                    />
                );
            },
        },
        {
            colId: "actions",
            headerName: "Actions",
            width: 120,
            pinned: "right",
            sortable: false,
            filter: false,
            cellRenderer: createActionColumnRenderer(actions),
        },
    ]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <CardTitle>AMC Billing Dashboard</CardTitle>
                <CardDescription>
                    One row per bill. Manage invoices and receipts per bill.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                {isLoading && bills.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        loading={isLoading}
                        columnDefs={colDefs}
                        gridOptions={{
                            defaultColDef: { filter: true, sortable: true },
                            pagination: true,
                        }}
                        enablePagination={true}
                    />
                )}
            </CardContent>

            <ManageInvoicesModal
                open={invoiceModal.open}
                onOpenChange={open => setInvoiceModal(prev => ({ ...prev, open }))}
                billingId={invoiceModal.id}
            />
            <ManageReceiptsModal
                open={receiptModal.open}
                onOpenChange={open => setReceiptModal(prev => ({ ...prev, open }))}
                billingId={receiptModal.id}
            />
        </Card>
    );
}