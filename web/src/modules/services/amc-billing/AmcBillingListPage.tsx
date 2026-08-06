import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
    Eye,
    ReceiptText,
    Banknote,
    PhoneCall,
    FileText,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { useAmcBillings } from "@/hooks/api/useAmcBilling";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import type { AmcBilling } from "./helpers/amc-billing.types";
import { billingFileUrl, INVOICE_DEADLINE_HOURS } from "./helpers/amc-billing.types";
import { SubmitInvoiceModal } from "./components/SubmitInvoiceModal";
import { PaymentReceivedModal } from "./components/PaymentReceivedModal";

const STATUS_STYLES: Record<string, string> = {
    "Signed Service reports Received": "bg-amber-100 text-amber-800 border-amber-200",
    "Bill Submitted": "bg-blue-100 text-blue-800 border-blue-200",
    "Payment Received": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function pad(value: number) {
    return String(value).padStart(2, "0");
}

function TimerCell({ completedDate, stopped }: { completedDate: string | null; stopped: boolean }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (stopped || !completedDate) {
        return <span className="text-muted-foreground">—</span>;
    }

    const deadline = new Date(completedDate).getTime() + INVOICE_DEADLINE_HOURS * 3600 * 1000;
    const remaining = deadline - now;

    if (remaining <= 0) {
        return <span className="font-medium text-red-600">Overdue</span>;
    }

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    const color =
        remaining < 6 * 3600 * 1000 ? "text-amber-600" : "text-emerald-600";

    return (
        <span className={cn("font-medium tabular-nums", color)}>
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
    );
}

function ContactCell({ row }: { row: AmcBilling }) {
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

function FileCell({ path }: { path: string | null }) {
    if (!path) {
        return <span className="text-muted-foreground">—</span>;
    }
    return (
        <a
            href={billingFileUrl(path)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
        >
            <FileText className="h-3.5 w-3.5" /> View
        </a>
    );
}

export default function AmcBillingListPage() {
    const navigate = useNavigate();
    const { data: billings = [], isLoading } = useAmcBillings();

    const [submitModal, setSubmitModal] = useState<{ open: boolean; id: number | null }>({
        open: false,
        id: null,
    });
    const [paymentModal, setPaymentModal] = useState<{ open: boolean; id: number | null }>({
        open: false,
        id: null,
    });

    const rows = useMemo(() => billings, [billings]);

    const actions: ActionItem<AmcBilling>[] = [
        {
            label: "Submit Invoice",
            onClick: row => setSubmitModal({ open: true, id: row.id }),
            icon: <ReceiptText className="h-4 w-4" />,
        },
        {
            label: "Payment Received",
            onClick: row => setPaymentModal({ open: true, id: row.id }),
            icon: <Banknote className="h-4 w-4" />,
        },
        {
            label: "Initiate Followup",
            onClick: () => toast.info("Follow-up is coming soon"),
            icon: <PhoneCall className="h-4 w-4" />,
        },
        {
            label: "View",
            onClick: row => navigate(paths.services.amcBillingShow(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const colDefs = useState<ColDef<AmcBilling>[]>(() => [
        {
            colId: "projectName",
            headerName: "Project Name",
            field: "projectName",
            width: 240,
            valueGetter: params => params.data?.amc?.projectName ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => {
                const name = params.data?.amc?.projectName;
                return (
                    <span className={cn(!name && "text-muted-foreground")}>
                        {name ?? "—"}
                    </span>
                );
            },
        },
        {
            colId: "contactDetails",
            headerName: "Contact details",
            width: 200,
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => (
                <ContactCell row={params.data!} />
            ),
        },
        {
            colId: "billingDueDate",
            headerName: "Billing Due date",
            width: 140,
            cellRenderer: () => <span className="text-muted-foreground">—</span>,
        },
        {
            colId: "serviceEngineer",
            headerName: "Service Engg Name",
            width: 180,
            valueGetter: params => params.data?.amc?.serviceEngineers?.[0]?.name ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => {
                const name = params.data?.amc?.serviceEngineers?.[0]?.name;
                return (
                    <span className={cn(!name && "text-muted-foreground")}>
                        {name ?? "—"}
                    </span>
                );
            },
        },
        {
            colId: "teamName",
            headerName: "TE Name",
            width: 100,
            valueGetter: params => params.data?.amc?.teamName ?? "—",
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => (
                <span>{params.data?.amc?.teamName ?? "—"}</span>
            ),
        },
        {
            colId: "status",
            headerName: "Status",
            width: 220,
            field: "status",
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => {
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
            colId: "signedServiceReport",
            headerName: "Signed Service reports Received",
            width: 180,
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => {
                const received = !!params.data?.amc?.signedServiceReportPath;
                return received ? (
                    <Badge
                        variant="outline"
                        className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium"
                    >
                        Yes
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">—</span>
                );
            },
        },
        {
            colId: "billSubmitted",
            headerName: "Bill Submitted",
            width: 140,
            field: "invoice",
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => (
                <FileCell path={params.data?.invoice ?? null} />
            ),
        },
        {
            colId: "paymentReceived",
            headerName: "Payment Received",
            width: 150,
            field: "paymentReceipt",
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => (
                <FileCell path={params.data?.paymentReceipt ?? null} />
            ),
        },
        {
            colId: "timer",
            headerName: "Timer",
            width: 110,
            cellRenderer: (params: CustomCellRendererProps<AmcBilling>) => (
                <TimerCell
                    completedDate={params.data?.serviceCompletedDate ?? null}
                    stopped={params.data?.status !== "Signed Service reports Received"}
                />
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
    ])[0];

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <CardTitle>AMC Billing Dashboard</CardTitle>
                <CardDescription>
                    Completed services awaiting / processing billing. Raise the invoice within{" "}
                    {INVOICE_DEADLINE_HOURS} hours of the signed service report upload.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                {isLoading && billings.length === 0 ? (
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

            <SubmitInvoiceModal
                open={submitModal.open}
                onOpenChange={open => setSubmitModal(prev => ({ ...prev, open }))}
                billingId={submitModal.id}
            />
            <PaymentReceivedModal
                open={paymentModal.open}
                onOpenChange={open => setPaymentModal(prev => ({ ...prev, open }))}
                billingId={paymentModal.id}
            />
        </Card>
    );
}
