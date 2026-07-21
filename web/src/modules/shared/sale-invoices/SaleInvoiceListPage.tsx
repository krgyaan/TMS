import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAllSaleInvoices } from "@/hooks/api/useSaleInvoices";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { getShortId } from "@/lib/id-utils";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { SaleInvoiceListRow } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Banknote, Eye, HandCoins, LampCeiling, Lock, Search, Upload } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import CreditNoteDialog from "./components/CreditNoteDialog";
import HoldAmountDialog from "./components/HoldAmountDialog";
import HoldReleasedDialog from "./components/HoldReleasedDialog";
import PaymentReceivedDialog from "./components/PaymentReceivedDialog";
import UploadInvoiceDialog from "./components/UploadInvoiceDialog";

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "success" | "destructive" }> = {
    oe_request: { label: "OE Request", variant: "outline" },
    invoiced: { label: "Invoiced", variant: "secondary" },
    credit_note: { label: "Credit Note", variant: "default" },
    payment_received: { label: "Payment Received", variant: "success" },
    completed: { label: "Completed", variant: "success" },
};

const SUBTABS = [
    { key: "oe_request", label: "OE Request" },
    { key: "invoiced", label: "Invoiced" },
    { key: "payment_received", label: "Payment Received" },
    { key: "completed", label: "Completed" },
    { key: "credit_note", label: "Credit Note" },
] as const;

type SubTabKey = (typeof SUBTABS)[number]["key"];

const SaleInvoiceListPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { data, isLoading } = useAllSaleInvoices();
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedSearch(search, 300);

    const isAccountsSection = location.pathname.includes("/accounts/");

    // Dialog states
    const [uploadRow, setUploadRow] = useState<SaleInvoiceListRow | null>(null);
    const [creditNoteRow, setCreditNoteRow] = useState<SaleInvoiceListRow | null>(null);
    const [paymentReceivedRow, setPaymentReceivedRow] = useState<SaleInvoiceListRow | null>(null);
    const [holdAmountRow, setHoldAmountRow] = useState<SaleInvoiceListRow | null>(null);
    const [holdReleasedRow, setHoldReleasedRow] = useState<SaleInvoiceListRow | null>(null);

    const saleInvoices = useMemo(() => (data?.saleInvoices ?? []) as SaleInvoiceListRow[], [data]);

    const { activeTab: activeSubTab, setActiveTab: setActiveSubTab } = usePersistentTableState<SubTabKey>({
        storageKey: "sale-invoices-subtab",
        defaultTab: "oe_request",
        tabParam: "subtab",
    });

    const filteredInvoices = useMemo(() => {
        return saleInvoices.filter((r) => r.status === activeSubTab);
    }, [saleInvoices, activeSubTab]);

    const subtabCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const tab of SUBTABS) {
            counts[tab.key] = saleInvoices.filter((r) => r.status === tab.key).length;
        }
        return counts;
    }, [saleInvoices]);

    const onGridReady = useCallback((event: GridReadyEvent<SaleInvoiceListRow>) => {
        setGridApi(event.api);
    }, []);

    useEffect(() => {
        gridApi?.setGridOption("quickFilterText", debouncedSearch || undefined);
    }, [debouncedSearch, gridApi]);

    const handleView = useCallback((row: SaleInvoiceListRow) => {
        navigate(paths.operations.viewSaleInvoice(row.id));
    }, [navigate]);

    const closeAll = useCallback(() => {
        setUploadRow(null);
        setCreditNoteRow(null);
        setPaymentReceivedRow(null);
        setHoldAmountRow(null);
        setHoldReleasedRow(null);
    }, []);

    const siActions: ActionItem<SaleInvoiceListRow>[] = useMemo(() => {
        const base: ActionItem<SaleInvoiceListRow>[] = [
            {
                label: "View Details",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row) => handleView(row),
            },
        ];

        if (isAccountsSection) {
            return [
                {
                    label: "Upload Invoice",
                    icon: <Upload className="h-4 w-4" />,
                    onClick: (row) => setUploadRow(row),
                    visible: (row) => row.status === "oe_request",
                },
                {
                    label: "Credit Note",
                    icon: <LampCeiling className="h-4 w-4" />,
                    onClick: (row) => setCreditNoteRow(row),
                    visible: (row) => row.status === "invoiced",
                },
                {
                    label: "Payment Received",
                    icon: <Banknote className="h-4 w-4" />,
                    onClick: (row) => setPaymentReceivedRow(row),
                    visible: (row) => row.status === "invoiced" || row.status === "credit_note",
                },
                {
                    label: "Hold Amount",
                    icon: <Lock className="h-4 w-4" />,
                    onClick: (row) => setHoldAmountRow(row),
                },
                {
                    label: "Release Hold",
                    icon: <HandCoins className="h-4 w-4" />,
                    onClick: (row) => setHoldReleasedRow(row),
                },
                ...base,
            ];
        }

        return base;
    }, [isAccountsSection, handleView]);

    const statusBadge = (status: string) => {
        const cfg = STATUS_CONFIG[status] || { label: status, variant: "outline" as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    };

    const siColumns = useMemo<ColDef<SaleInvoiceListRow>[]>(() => [
        {
            field: "invoiceNumber",
            headerName: "Invoice Number",
            sortable: true,
            filter: true,
            width: 300,
            flex: 1,
            cellRenderer: (p: CustomCellRendererProps<SaleInvoiceListRow>) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>{getShortId(p.value)}</span>
                        </TooltipTrigger>
                        <TooltipContent>{p.value}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            field: "invoiceDate",
            headerName: "Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: ValueFormatterParams<SaleInvoiceListRow>) => formatDate(p.value),
        },
        {
            field: "projectName",
            headerName: "Project",
            sortable: true,
            filter: true,
            flex: 1,
        },
        {
            field: "billingCustomerName",
            headerName: "Customer",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
        },
        {
            field: "totalPreGst",
            headerName: "Pre-GST",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<SaleInvoiceListRow>) => formatINR(Number(p.value || 0)),
        },
        {
            field: "totalGst",
            headerName: "GST",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<SaleInvoiceListRow>) => formatINR(Number(p.value || 0)),
        },
        {
            field: "grandTotal",
            headerName: "Total",
            sortable: true,
            valueFormatter: (p: ValueFormatterParams<SaleInvoiceListRow>) => formatINR(Number(p.value || 0)),
        },
        {
            field: "status",
            headerName: "Status",
            sortable: true,
            filter: true,
            cellRenderer: (p: CustomCellRendererProps<SaleInvoiceListRow>) => statusBadge(p.value),
        },
        {
            field: "raisedByName",
            headerName: "Raised By",
            sortable: true,
            filter: true,
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<SaleInvoiceListRow>(siActions),
            width: 80,
            pinned: "right" as const,
        },
    ], [siActions]);

    return (
        <>
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold">Sale Invoices</CardTitle>
                    <CardDescription>{filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""} found</CardDescription>
                    <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as SubTabKey)}>
                        <TabsList className="m-auto mb-0">
                            {SUBTABS.map((tab) => (
                                <TabsTrigger key={tab.key} value={tab.key} className="data-[state=active]:shadow-md flex items-center gap-1">
                                    {tab.label}
                                    <Badge variant="secondary" className="text-xs">{subtabCounts[tab.key]}</Badge>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex justify-end">
                        <div className="relative mb-4">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search ..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-64 w-full rounded-lg" />
                    ) : (
                        <DataTable
                            data={filteredInvoices}
                            columnDefs={siColumns}
                            onGridReady={onGridReady}
                            gridOptions={{
                                pagination: true,
                                paginationPageSize: 100,
                                domLayout: "autoHeight",
                            }}
                        />
                    )}
                </CardContent>
            </Card>

            <UploadInvoiceDialog row={uploadRow} open={uploadRow !== null} onClose={closeAll} />
            <CreditNoteDialog row={creditNoteRow} open={creditNoteRow !== null} onClose={closeAll} />
            <PaymentReceivedDialog row={paymentReceivedRow} open={paymentReceivedRow !== null} onClose={closeAll} />
            <HoldAmountDialog row={holdAmountRow} open={holdAmountRow !== null} onClose={closeAll} />
            <HoldReleasedDialog row={holdReleasedRow} open={holdReleasedRow !== null} onClose={closeAll} />
        </>
    );
};

export default SaleInvoiceListPage;
