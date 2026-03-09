// src/pages/wo-dashboard/WODashboardPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";

import {
    Plus,
    Search,
    Eye,
    FileText,
    FileEdit,
    CheckCircle,
    Upload,
    Clock,
    AlertCircle,
    Timer,
    MoreHorizontal,
    FileCheck,
    ClipboardList,
    RefreshCw,
    Calendar,
    IndianRupee,
    Building2,
    Download,
    Filter,
    FileSignature,
    Briefcase,
    Stamp,
} from "lucide-react";
import { paths } from "@/app/routes/paths";
import { toast } from "sonner";

/* ================================
   TYPES
================================ */
interface WORecord {
    id: number;
    tenderNameId: number;
    enquiryId: number | null;

    number: string | null;
    date: string | null;

    parGst: string | null;
    parAmt: string | null;

    image: string | null;
    loGemImg: string | null;
    foaSapImage: string | null;

    costingReceipt: string | null;
    costingBudget: string | null;
    costingGrossMargin: string | null;

    status: string;

    createdAt: string | null;
    updatedAt: string | null;

    tenderInfo?: {
        tenderNo: string;
        tenderName: string;
        dueDate: string;
    };
}

type WOStatus = "po_awaited" | "basic_details_filled" | "wo_details_filled" | "wo_amendment_requested" | "wo_accepted" | "wo_uploaded";

/* ================================
   HELPERS
================================ */
const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatCurrency = (amount: number | null): string => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const STATUS_CONFIG: Record<WOStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
    po_awaited: { label: "PO Awaited", variant: "secondary", icon: Clock },
    basic_details_filled: { label: "Basic Details Filled", variant: "outline", icon: FileText },
    wo_details_filled: { label: "WO Details Filled", variant: "outline", icon: ClipboardList },
    wo_amendment_requested: { label: "Amendment Requested", variant: "destructive", icon: AlertCircle },
    wo_accepted: { label: "WO Accepted", variant: "default", icon: CheckCircle },
    wo_uploaded: { label: "WO Uploaded", variant: "default", icon: Upload },
};

/* ================================
   ICON ACTION COMPONENT
================================ */
const IconAction: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "default" | "primary" | "success" | "warning" | "info";
}> = ({ icon: Icon, label, onClick, disabled, variant = "default" }) => {
    const variantClasses = {
        default: "text-muted-foreground hover:bg-muted hover:text-foreground",
        primary: "text-primary hover:bg-primary/10",
        success: "text-emerald-600 hover:bg-emerald-50",
        warning: "text-amber-600 hover:bg-amber-50",
        info: "text-sky-600 hover:bg-sky-50",
    };

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            onClick();
                        }}
                        disabled={disabled}
                        className={cn(
                            "inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                            variantClasses[variant],
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-medium">
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

/* ================================
   STATUS BADGE COMPONENT
================================ */
const StatusBadge: React.FC<{ status: WOStatus }> = ({ status }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className="font-normal gap-1.5">
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
};

/* ================================
   TIMER COMPONENT
================================ */
const TimerDisplay: React.FC<{ daysRemaining: number | null }> = ({ daysRemaining }) => {
    return "-";
};

/* ================================
   MAIN COMPONENT
================================ */
const WoDashboardPage: React.FC = () => {
    const navigate = useNavigate();

    /* ================================
       STATE
    ================================ */
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const [records, setRecords] = useState<WORecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkOrders = async () => {
            try {
                const { data } = await api.get("/work-order");
                setRecords(Array.isArray(data) ? data : []);
            } catch (error: any) {
                toast.error(error?.response?.data?.message ?? "Failed to fetch work orders");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkOrders();
    }, []);

    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            if (!searchQuery) return true;

            const query = searchQuery.toLowerCase();

            return (
                record.number?.toLowerCase().includes(query) ||
                record.tenderInfo?.tenderName?.toLowerCase().includes(query) ||
                record.tenderInfo?.tenderNo?.toLowerCase().includes(query)
            );
        });
    }, [records, searchQuery]);

    /* ================================
       COLUMNS
    ================================ */
    const columns: ColDef<WORecord>[] = [
        // ===============================
        // WO Date → backend: date
        // ===============================
        {
            field: "date",
            headerName: "WO Date",
            maxWidth: 130,
            valueFormatter: p => (p.value ? formatDate(p.value) : "-"),
            cellClass: "text-sm justify-center",
        },

        // ===============================
        // Project Name → backend: tenderInfo.tenderName
        // ===============================
        {
            headerName: "Project Name",
            flex: 2,
            minWidth: 260,
            valueGetter: p => p.data?.tenderInfo?.tenderName ?? "-",
            cellRenderer: (p: any) => (
                <div className="truncate font-medium w-full" title={p.value}>
                    {p.value}
                </div>
            ),
        },

        // ===============================
        // WO Number → backend: number
        // ===============================
        {
            field: "number",
            headerName: "WO Number",
            maxWidth: 170,
            cellClass: "font-mono text-sm justify-center",
            valueFormatter: p => p.value ?? "-",
        },

        // ===============================
        // WO Value (Pre-GST) → backend: parAmt
        // ===============================
        {
            field: "parAmt",
            headerName: "WO Value (Pre-GST)",
            maxWidth: 170,
            valueFormatter: p => (p.value ? formatCurrency(Number(p.value)) : "-"),
            cellClass: "font-medium tabular-nums justify-end pr-3",
        },

        // ===============================
        // LD Start Date → NOT AVAILABLE
        // ===============================
        {
            headerName: "LdStartDate",
            maxWidth: 140,
            valueGetter: p => ("ldStartDate" in (p.data ?? {}) ? ((p.data as any).woDetails.ldStartDate ?? "-") : "-"),
            cellClass: "text-sm justify-center",
        },

        // ===============================
        // Max LD Date → NOT AVAILABLE
        // ===============================
        {
            headerName: "MaxLdDate",
            maxWidth: 140,
            valueGetter: p => ("maxLdDate" in (p.data ?? {}) ? ((p.data as any)?.woDetails?.maxLdDate ?? "-") : "-"),
            cellClass: "text-sm justify-center",
        },

        // ===============================
        // PBG Applicable → NOT AVAILABLE
        // ===============================
        {
            headerName: "PbgApplicable",
            maxWidth: 150,
            valueGetter: p => ("pbgApplicable" in (p.data ?? {}) ? ((p.data as any)?.woDetails?.pbgApplicable == "1" ? "Yes" : "No") : "-"),
            cellClass: "justify-center",
        },

        // ===============================
        // Contract Agreement → NOT AVAILABLE
        // ===============================
        {
            headerName: "ContractAgreement",
            maxWidth: 170,
            valueGetter: p => ("contractAgreement" in (p.data ?? {}) ? ((p.data as any).woDetails.contractAgreement ?? "-") : "-"),
            cellClass: "justify-center",
        },

        // ===============================
        // Status → backend: status (ignored value-wise)
        // ===============================
        {
            field: "status",
            headerName: "Status",
            minWidth: 180,
            valueFormatter: () => "-",
        },

        // ===============================
        // Timer / Days Remaining → NOT AVAILABLE
        // ===============================
        {
            headerName: "DaysRemaining",
            maxWidth: 120,
            valueGetter: p => ("daysRemaining" in (p.data ?? {}) ? ((p.data as any).daysRemaining ?? "-") : "-"),
            cellClass: "justify-center",
        },

        // ===============================
        // ACTION COLUMN
        // ===============================
        {
            headerName: "Action",
            pinned: "right",
            sortable: false,
            filter: false,
            minWidth: 200,
            cellClass: "justify-center",
            cellRenderer: (p: any) => {
                const row = p.data as WORecord;

                return (
                    <TooltipProvider delayDuration={100}>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <IconAction icon={FileSignature} label="Basic Details" onClick={() => navigate(paths.operations.workOrderBasic(row.id))} />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Basic Details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <IconAction icon={Briefcase} label="WO Details" onClick={() => navigate(paths.operations.workOrderDetailAdd(row.id))} />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>WO Details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <IconAction icon={Stamp} label="WO Acceptance" onClick={() => navigate(paths.operations.workOrderAcceptance(row.id))} />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>WO Acceptance</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <IconAction icon={Eye} label="View" onClick={() => navigate(paths.operations.WoView, { state: { id: row.id } })} />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>View</TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                );
            },
        },
    ];
    /* ================================
       RENDER
    ================================ */
    return (
        <div className="space-y-6">
            {/* Main Table Card */}
            <Card className="flex flex-col h-full min-h-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle>WO Dashboard</CardTitle>
                        <CardDescription>
                            {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
                        </CardDescription>
                    </div>

                    <Button size="sm" onClick={() => console.log("Add Basic Details")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Basic Details
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 min-h-0 flex flex-col gap-4">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input placeholder="Search by project or WO number…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-72" />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 min-h-0">
                        <DataTable
                            className="h-full"
                            data={filteredRecords}
                            columnDefs={columns}
                            gridOptions={{
                                defaultColDef: { editable: false, filter: true, sortable: true },
                                pagination: true,
                                paginationPageSize: 20,
                                rowHeight: 52,
                                headerHeight: 44,
                                suppressCellFocus: true,
                            }}
                        />
                    </div>

                    {/* Empty State */}
                    {filteredRecords.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                            <p className="text-sm font-medium">No work orders found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "Add a new work order to get started"}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WoDashboardPage;
