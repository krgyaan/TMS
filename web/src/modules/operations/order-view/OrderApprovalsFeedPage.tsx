import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Briefcase,
    CheckCircle2,
    Clock,
    Edit3,
    FileText,
    Search,
    ShieldCheck,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllPurchaseOrders } from "@/hooks/api/usePurchaseOrders";
import { useAllVendorWorkOrders } from "@/hooks/api/useVendorWorkOrders";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";

type OrderTab = "po" | "wo";
type StatusFilter = "all" | "pending_tl" | "edit_requested" | "pending_accounts" | "approved" | "rejected";

function getTlBadge(tlStatus?: number | null, finalApproved?: boolean | null) {
    if (finalApproved === true) {
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
    }
    if (finalApproved === false) {
        return (
            <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {tlStatus === 2 ? "Rejected (TL)" : "Rejected"}
            </Badge>
        );
    }
    if (tlStatus === 3) {
        return (
            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                <Edit3 className="h-3 w-3" />
                Edit Requested (TL)
            </Badge>
        );
    }
    if (tlStatus === 1) {
        return (
            <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending Accounts
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
            <Clock className="h-3 w-3" />
            Pending TL Approval
        </Badge>
    );
}

const OrderApprovalsFeedPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<OrderTab>("po");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const poQuery = useAllPurchaseOrders(undefined, "operations");
    const vwoQuery = useAllVendorWorkOrders(undefined, "operations");

    const poRows = useMemo(() => poQuery.data?.purchaseOrders ?? [], [poQuery.data]);
    const vwoRows = useMemo(() => (Array.isArray(vwoQuery.data) ? vwoQuery.data : []), [vwoQuery.data]);

    const normalizedItems = useMemo(() => {
        const raw =
            activeTab === "po"
                ? poRows.map((po: any) => ({
                      id: po.id,
                      type: "po" as const,
                      number: po.poNumber || `PO #${po.id}`,
                      projectName: po.projectName || "—",
                      sellerName: po.sellerName || "—",
                      grandTotal: Number(po.grandTotal || 0),
                      date: po.poDate,
                      raisedBy: po.poRaisedBy || "—",
                      tlStatus: Number(po.tlStatus ?? 0),
                      tlComment: po.tlComment ?? null,
                      approved: po.poApproved,
                  }))
                : vwoRows.map((wo: any) => ({
                      id: wo.id,
                      type: "wo" as const,
                      number: wo.woNumber || `WO #${wo.id}`,
                      projectName: wo.projectName || "—",
                      sellerName: wo.sellerName || "—",
                      grandTotal: Number(wo.grandTotal || 0),
                      date: wo.woDate,
                      raisedBy: wo.woRaisedBy || "—",
                      tlStatus: Number(wo.tlStatus ?? 0),
                      tlComment: wo.tlComment ?? null,
                      approved: wo.woApproved,
                  }));

        return raw.filter(item => {
            if (statusFilter === "pending_tl" && !(item.approved == null && item.tlStatus === 0)) return false;
            if (statusFilter === "edit_requested" && item.tlStatus !== 3) return false;
            if (statusFilter === "pending_accounts" && !(item.approved == null && item.tlStatus === 1)) return false;
            if (statusFilter === "approved" && item.approved !== true) return false;
            if (statusFilter === "rejected" && item.approved !== false && item.tlStatus !== 2) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const haystack = `${item.number} ${item.projectName} ${item.sellerName} ${item.raisedBy}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [activeTab, poRows, vwoRows, statusFilter, searchQuery]);

    const isLoading = activeTab === "po" ? poQuery.isLoading : vwoQuery.isLoading;

    return (
        <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-6">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                PO & WO PDF Approvals
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Tap any Purchase Order or Work Order to open its PDF preview and submit Approve, Reject, or Edit comments.
                            </CardDescription>
                        </div>

                        {/* PO vs WO Switcher */}
                        <div className="grid grid-cols-2 gap-2 sm:w-72">
                            <Button
                                type="button"
                                size="sm"
                                variant={activeTab === "po" ? "default" : "outline"}
                                onClick={() => setActiveTab("po")}
                                className="gap-1.5"
                            >
                                <FileText className="h-4 w-4" />
                                Purchase Orders ({poRows.length})
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={activeTab === "wo" ? "default" : "outline"}
                                onClick={() => setActiveTab("wo")}
                                className="gap-1.5"
                            >
                                <Briefcase className="h-4 w-4" />
                                Work Orders ({vwoRows.length})
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                    {/* Search & Status Filter Pills */}
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`Search ${activeTab === "po" ? "PO" : "WO"} number, vendor, project, or creator...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 text-sm"
                            />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(
                                [
                                    { key: "all", label: "All" },
                                    { key: "pending_tl", label: "Pending TL" },
                                    { key: "edit_requested", label: "Edit Requested" },
                                    { key: "pending_accounts", label: "Pending Accounts" },
                                    { key: "approved", label: "Approved" },
                                    { key: "rejected", label: "Rejected" },
                                ] as Array<{ key: StatusFilter; label: string }>
                            ).map(pill => (
                                <Button
                                    key={pill.key}
                                    type="button"
                                    size="sm"
                                    variant={statusFilter === pill.key ? "default" : "outline"}
                                    className="h-7 px-2.5 text-xs"
                                    onClick={() => setStatusFilter(pill.key)}
                                >
                                    {pill.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cards List */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                </div>
            ) : normalizedItems.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                        No {activeTab === "po" ? "Purchase Orders" : "Work Orders"} match the current filter.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {normalizedItems.map(item => (
                        <Card
                            key={`${item.type}-${item.id}`}
                            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
                            onClick={() => navigate(`/operations/${item.type}/${item.id}/approval`)}
                        >
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-semibold text-foreground sm:text-base">
                                            {item.number}
                                        </span>
                                        {getTlBadge(item.tlStatus, item.approved)}
                                    </div>
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                        Vendor: <strong className="text-foreground">{item.sellerName}</strong>
                                        {" · "}
                                        Project: <strong className="text-foreground">{item.projectName}</strong>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Raised By: {item.raisedBy}
                                        {item.date ? ` · ${formatDate(item.date)}` : ""}
                                    </p>
                                    {item.tlComment && (
                                        <p className="mt-1 rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
                                            <strong>TL Feedback:</strong> {item.tlComment}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-row items-center justify-between gap-3 border-t pt-2 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                                    <div className="text-left sm:text-right">
                                        <span className="text-[11px] text-muted-foreground">Grand Total</span>
                                        <p className="text-sm font-bold text-foreground sm:text-base">
                                            {formatINR(item.grandTotal)}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={e => {
                                            e.stopPropagation();
                                            navigate(`/operations/${item.type}/${item.id}/approval`);
                                        }}
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        PDF Preview & Approve
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrderApprovalsFeedPage;
