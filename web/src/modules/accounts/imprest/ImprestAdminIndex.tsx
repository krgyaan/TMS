// imprest-admin.index.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { Loader2, ExternalLink, Receipt, LayoutDashboard, FileText, IndianRupee, Plus } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useEmployeeImprestSummary } from "./imprest-admin.hooks";
import type { EmployeeImprestSummary } from "./imprest-admin.types";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useAuth } from "@/contexts/AuthContext";

import type { GridApi } from "ag-grid-community";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PayImprestDialog } from "./components/PayImprestDialog";
/** INR formatter */
const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

const ImprestAdminIndex: React.FC = () => {
    const [searchText, setSearchText] = useState("");
    const [gridApi, setGridApi] = useState<GridApi | null>(null);

    const [payImprestUser, setPayImprestUser] = useState<{
        userId: number;
        userName: string;
    } | null>(null);

    const { isAdmin, isSuperUser, canRead } = useAuth();

    console.log("Rendering ImprestAdminIndex...");
    const loggedInUser = useAuth().user;
    const isAuthorized = isAdmin || isSuperUser;
    const navigate = useNavigate();
    const { data = [], isLoading, error } = useEmployeeImprestSummary();
    console.log("Fetched employee imprest summary data:", data);

    const canView = canRead("accounts.imprests");

    useEffect(() => {
        if (!canView) {
            navigate(paths.shared.imprest);
        }
    }, [canView, navigate]);

    const imprestActions: ActionItem<EmployeeImprestSummary>[] = [
        {
            label: "Dashboard",
            icon: <LayoutDashboard className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.imprestUser(row.userId)),
        },
        {
            label: "Payment History",
            icon: <Receipt className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.imprestPaymentHistoryByUser(row.userId)),
        },
        {
            label: "Voucher",
            icon: <FileText className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.imprestVoucherByUser(row.userId)),
        },
        {
            label: "Pay Imprest",
            icon: <IndianRupee className="h-4 w-4" />,
            onClick: row =>
                setPayImprestUser({
                    userId: row.userId,
                    userName: row.userName,
                }),
        },
    ];

    /* -------------------- GLOBAL SUMMARY -------------------- */
    const totals = useMemo(() => {
        return data.reduce(
            (acc, e) => {
                acc.received += e.amountReceived;
                acc.spent += e.amountSpent;
                acc.approved += e.amountApproved;
                acc.left += e.amountLeft;

                acc.totalVouchers += e.voucherInfo?.totalVouchers || 0;
                acc.accountsApproved += e.voucherInfo?.accountsApproved || 0;
                acc.adminApproved += e.voucherInfo?.adminApproved || 0;

                return acc;
            },
            { received: 0, spent: 0, approved: 0, left: 0, totalVouchers: 0, accountsApproved: 0, adminApproved: 0 }
        );
    }, [data]);

    /* -------------------- TABLE COLUMNS -------------------- */
    const columns = useMemo(
        () => [
            {
                field: "userName",
                headerName: "Employee Name",
                cellRenderer: (p: any) => {
                    const userId = p.data.userId;

                    return (
                        <a href={paths.shared.imprestUser(userId)} className="underline inline-flex items-center gap-1">
                            {p.value}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    );
                },
            },
            {
                field: "amountReceived",
                headerName: "Amount Received",
                valueFormatter: (p: any) => formatINR(p.value),
            },
            {
                field: "amountSpent",
                headerName: "Amount Spent",
                valueFormatter: (p: any) => formatINR(p.value),
            },
            {
                field: "amountApproved",
                headerName: "Amount Approved",
                valueFormatter: (p: any) => formatINR(p.value),
            },
            {
                field: "amountLeft",
                headerName: "Amount Left",
                valueFormatter: (p: any) => formatINR(p.value),
            },
            {
                headerName: "Total Vouchers",
                field: "voucherInfo.totalVouchers",
                filter: "agNumberColumnFilter",
                width: 140,
                cellStyle: { textAlign: "center" },
            },
            {
                headerName: "Accounts Approved",
                field: "voucherInfo.accountsApproved",
                filter: "agNumberColumnFilter",
                width: 160,
                cellStyle: { textAlign: "center" },
            },
            {
                headerName: "Admin Approved",
                field: "voucherInfo.adminApproved",
                filter: "agNumberColumnFilter",
                width: 140,
                cellStyle: { textAlign: "center" },
            },

            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer<EmployeeImprestSummary>(imprestActions),
                width: 80,
                pinned: "right",
            },
        ],
        [navigate]
    );

    /* -------------------- STATES -------------------- */
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin mr-2" />
                Loading employee imprests…
            </div>
        );
    }

    if (error) {
        return <div className="text-red-600">Failed to load data</div>;
    }

    /* -------------------- UI -------------------- */
    return (
        <div className="space-y-6">
            {/* SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Amount Received</p>
                                <h3 className="text-2xl font-bold text-foreground">{formatINR(totals.received)}</h3>
                            </div>
                            <div className="p-2 bg-chart-3/10 rounded-lg text-chart-3">
                                <IndianRupee className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Amount Spent</p>
                                <h3 className="text-2xl font-bold text-foreground">{formatINR(totals.spent)}</h3>
                            </div>
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Receipt className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Amount Approved</p>
                                <h3 className="text-2xl font-bold text-foreground">{formatINR(totals.approved)}</h3>
                            </div>
                            <div className="p-2 bg-chart-2/10 rounded-lg text-chart-2">
                                <FileText className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Amount Left</p>
                                <h3 className="text-2xl font-bold text-foreground">{formatINR(totals.left)}</h3>
                            </div>
                            <div className="p-2 bg-chart-5/10 rounded-lg text-chart-5">
                                <LayoutDashboard className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* VOUCHER SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-md text-muted-foreground">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Vouchers</p>
                                <p className="text-xl font-bold text-foreground">{totals.totalVouchers}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-md text-primary">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accounts Approved</p>
                                <p className="text-xl font-bold text-foreground">{totals.accountsApproved}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-chart-2/10 rounded-md text-chart-2">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Approved</p>
                                <p className="text-xl font-bold text-foreground">{totals.adminApproved}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* TABLE */}
            <Card>
                <CardHeader className="flex items-center justify-between space-y-1 pb-0">
                    <div className="space-y-1">
                        <CardTitle>All Employee Imprest Details</CardTitle>
                        <CardDescription>{data.length} employees found</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Input
                            type="text"
                            placeholder="Search employee..."
                            value={searchText}
                            onChange={e => {
                                const value = e.target.value;
                                setSearchText(value);
                                gridApi?.setGridOption("quickFilterText", value);
                            }}
                            className="w-64"
                        />

                        <Button size="sm" onClick={() => navigate(paths.shared.imprestPaymentHistory)}>
                            <Plus className="h-4 w-4 mr-2" />
                            All Payment History
                        </Button>
                        <Button size="sm" onClick={() => navigate(paths.shared.imprestVoucher)}>
                            <Plus className="h-4 w-4 mr-2" />
                            All Vouchers
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <DataTable
                        data={data}
                        columnDefs={columns}
                        onGridReady={params => {
                            setGridApi(params.api);
                            params.api.setQuickFilter(searchText);
                        }}
                        gridOptions={{ pagination: true }}
                    />
                </CardContent>
            </Card>

            {payImprestUser && (
                <PayImprestDialog open={!!payImprestUser} onOpenChange={() => setPayImprestUser(null)} userId={payImprestUser.userId} userName={payImprestUser.userName} />
            )}
        </div>
    );
};

export default ImprestAdminIndex;
