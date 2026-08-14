import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
    Eye,
    ReceiptText,
    Banknote,
    PhoneCall,
    Loader2,
} from "lucide-react";
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    startOfDay,
} from "date-fns";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { useAmcBillings } from "@/hooks/api/useAmcBilling";
import { useUsers } from "@/hooks/api/useUsers";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
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

const BILL_DUE_WINDOW_DAYS = 30;

type BillStatusTab = "due" | "missed" | "done" | "all";
type BillPeriodTab = "all" | "week" | "month" | "year";

const STATUS_TABS: { key: BillStatusTab; label: string }[] = [
    { key: "due", label: "Due" },
    { key: "missed", label: "Missed" },
    { key: "done", label: "Done" },
    { key: "all", label: "All" },
];

const PERIOD_TABS: { key: BillPeriodTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "year", label: "This Year" },
];

function pad(value: number) {
    return String(value).padStart(2, "0");
}

function billInPeriod(bill: AmcBillDetail, period: BillPeriodTab) {
    if (!bill.billDueDate || period === "all") return true;
    const due = new Date(`${bill.billDueDate}T00:00:00`);
    const today = new Date();
    if (period === "week") {
        return (
            due >= startOfWeek(today, { weekStartsOn: 1 }) &&
            due <= endOfWeek(today, { weekStartsOn: 1 })
        );
    }
    if (period === "month") {
        return due >= startOfMonth(today) && due <= endOfMonth(today);
    }
    return due >= startOfYear(today) && due <= endOfYear(today);
}

function billMatchesStatus(bill: AmcBillDetail, tab: BillStatusTab) {
    const today = startOfDay(new Date());
    const paid = bill.status === "Payment Received";
    if (tab === "done") return paid;
    if (tab === "all") return true;
    if (paid) return false;
    if (!bill.billDueDate) return false;
    const due = new Date(`${bill.billDueDate}T00:00:00`);
    if (tab === "missed") return due < today;
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + BILL_DUE_WINDOW_DAYS);
    return due >= today && due <= windowEnd;
}

function TimerCell({ services }: { services?: AmcBillDetail["services"] }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const list = services ?? [];
    const allDone = list.length > 0 && list.every(s => s.status === "Done");

    if (!allDone) {
        return <span className="text-muted-foreground">—</span>;
    }

    const lastCompleted = list.reduce<number>((max, s) => {
        if (!s.serviceCompletedDate) return max;
        const ts = new Date(s.serviceCompletedDate).getTime();
        return isNaN(ts) ? max : Math.max(max, ts);
    }, 0);

    if (!lastCompleted) {
        return <span className="text-muted-foreground">—</span>;
    }

    const deadline = lastCompleted + INVOICE_DEADLINE_HOURS * 3600 * 1000;
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

export default function AmcBillingListPage() {
    const navigate = useNavigate();
    const { data: bills = [], isLoading } = useAmcBillings();
    const { data: users = [] } = useUsers();

    const [searchParams, setSearchParams] = useSearchParams();

    const periodTab = (searchParams.get("period") as BillPeriodTab) || "all";
    const setPeriodTab = (tab: BillPeriodTab) => {
        const next = new URLSearchParams(searchParams);
        next.set("period", tab);
        setSearchParams(next, { replace: true });
    };

    const {
        activeTab: statusTab,
        setActiveTab: setStatusTab,
    } = usePersistentTableState({
        storageKey: "amc-billing",
        defaultTab: "due" as BillStatusTab,
        tabParam: "tab",
    });

    const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; id: number | null }>({
        open: false,
        id: null,
    });
    const [receiptModal, setReceiptModal] = useState<{ open: boolean; id: number | null }>({
        open: false,
        id: null,
    });

    const userMap = useMemo(() => {
        const map = new Map<number, { name: string }>();
        for (const user of users) {
            if (user.id != null) map.set(user.id, { name: user.name });
        }
        return map;
    }, [users]);

    const billCountBySite = useMemo(() => {
        const map = new Map<number, number>();
        for (const bill of bills) {
            map.set(bill.amcSiteId, (map.get(bill.amcSiteId) ?? 0) + 1);
        }
        return map;
    }, [bills]);

    const periodRows = useMemo(
        () => bills.filter(bill => billInPeriod(bill, periodTab)),
        [bills, periodTab],
    );

    const statusCounts = useMemo<Record<BillStatusTab, number>>(() => {
        return {
            due: periodRows.filter(bill => billMatchesStatus(bill, "due")).length,
            missed: periodRows.filter(bill => billMatchesStatus(bill, "missed")).length,
            done: periodRows.filter(bill => billMatchesStatus(bill, "done")).length,
            all: periodRows.length,
        };
    }, [periodRows]);

    const rows = useMemo(
        () => periodRows.filter(bill => billMatchesStatus(bill, statusTab)),
        [periodRows, statusTab],
    );

    const colDefs = useMemo<ColDef<AmcBillDetail>[]>(() => {
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
                onClick: row => navigate(paths.services.amcBillingFollowUp(row.id)),
                icon: <PhoneCall className="h-4 w-4" />,
            },
            {
                label: "View",
                onClick: row => navigate(paths.services.amcBillingView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
        ];

        return [
        {
            colId: "projectName",
            headerName: "Project Name",
            width: 220,
            valueGetter: params => params.data?.amc?.projectName ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <span>{params.data?.amc?.projectName ?? "—"}</span>
            ),
        },
        {
            colId: "siteName",
            headerName: "Site Name",
            width: 180,
            valueGetter: params => params.data?.site?.name ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <span>{params.data?.site?.name ?? "—"}</span>
            ),
        },
        {
            colId: "amount",
            headerName: "Amount",
            width: 140,
            valueGetter: params => params.data?.amount ?? null,
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <span>{params.data?.amount != null ? formatINR(params.data.amount) : "—"}</span>
            ),
        },
        {
            colId: "billDueDate",
            headerName: "Billing Due",
            width: 140,
            sort: "asc",
            valueGetter: params => params.data?.billDueDate ?? "",
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => {
                const value = params.data?.billDueDate ?? null;
                if (!value) return <span className="text-muted-foreground">—</span>;
                const paid = params.data?.status === "Payment Received";
                const due = new Date(`${value}T00:00:00`);
                const crossed = due < startOfDay(new Date());
                return (
                    <span className={cn("font-medium", !paid && crossed ? "text-red-600" : "", !paid && !crossed ? "text-green-600" : "")}>
                        {formatDate(value)}
                    </span>
                );
            },
        },
        {
            colId: "te",
            headerName: "TE",
            width: 140,
            sortable: false,
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => {
                const teId = params.data?.amc?.allocatedTe;
                const name = teId != null ? (userMap.get(teId)?.name ?? null) : null;
                return <span>{name ?? "—"}</span>;
            },
        },
        {
            colId: "billNo",
            headerName: "Bill No.",
            width: 100,
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => {
                const row = params.data;
                if (!row) return null;
                const total = billCountBySite.get(row.amcSiteId) ?? 0;
                return (
                    <span className="font-medium tabular-nums">
                        {row.billNo}/{total}
                    </span>
                );
            },
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
            colId: "timer",
            headerName: "Invoice Timer",
            width: 130,
            cellRenderer: (params: CustomCellRendererProps<AmcBillDetail>) => (
                <TimerCell services={params.data?.services} />
            ),
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
        ];
    }, [userMap, billCountBySite, navigate]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>AMC Billing Dashboard</CardTitle>
                        <CardDescription>
                            One row per bill. Manage invoices and receipts per bill.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        {PERIOD_TABS.map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setPeriodTab(tab.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    periodTab === tab.key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg mb-4 mx-6 w-fit">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setStatusTab(tab.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                statusTab === tab.key
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab.label}
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "text-xs h-4 min-w-4 px-1",
                                    statusTab === tab.key && "bg-primary/10 text-primary",
                                )}
                            >
                                {statusCounts[tab.key]}
                            </Badge>
                        </button>
                    ))}
                </div>

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
