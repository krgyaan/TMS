import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { ExternalLink, FileText, IndianRupee, LayoutDashboard, Loader2, Plus, Receipt } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployeeImprestSummary } from "./imprest-admin.hooks";
import type { EmployeeImprestSummary } from "./imprest-admin.types";

import { Input } from "@/components/ui/input";
import type { GridApi } from "ag-grid-community";
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
    const currentFinancialYear = useMemo(() => {
        const now = new Date();
        const month = now.getMonth();
        const startYear = month >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const endYear = (startYear + 1) % 100;
        return `${startYear}-${String(endYear).padStart(2, "0")}`;
    }, []);
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
        const current = {
            received: 0,
            spent: 0,
            approved: 0,
            left: 0,
            totalVouchers: 0,
            accountsApproved: 0,
            adminApproved: 0,
        };

        const previousMap: Record<number, {
            financialYear: string;
            fyStartYear: number;
            received: number;
            spent: number;
            approved: number;
            left: number;
            totalVouchers: number;
            accountsApproved: number;
            adminApproved: number;
        }> = {};

        data.forEach(e => {
            current.received += e.current.amountReceived;
            current.spent += e.current.amountSpent;
            current.approved += e.current.amountApproved;
            current.left += e.current.amountLeft;
            current.totalVouchers += e.current.voucherInfo?.totalVouchers || 0;
            current.accountsApproved += e.current.voucherInfo?.accountsApproved || 0;
            current.adminApproved += e.current.voucherInfo?.adminApproved || 0;

            e.previous?.forEach(prev => {
                if (!previousMap[prev.fyStartYear]) {
                    previousMap[prev.fyStartYear] = {
                        financialYear: prev.financialYear,
                        fyStartYear: prev.fyStartYear,
                        received: 0,
                        spent: 0,
                        approved: 0,
                        left: 0,
                        totalVouchers: 0,
                        accountsApproved: 0,
                        adminApproved: 0,
                    };
                }
                const entry = previousMap[prev.fyStartYear];
                entry.received += prev.amountReceived;
                entry.spent += prev.amountSpent;
                entry.approved += prev.amountApproved;
                entry.left += prev.amountLeft;
                entry.totalVouchers += prev.voucherInfo?.totalVouchers || 0;
                entry.accountsApproved += prev.voucherInfo?.accountsApproved || 0;
                entry.adminApproved += prev.voucherInfo?.adminApproved || 0;
            });
        });

        const previousList = Object.values(previousMap).sort((a, b) => b.fyStartYear - a.fyStartYear);

        return {
            current,
            previous: previousList,
        };
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
                headerName: "Accounts Pending",
                wrapHeaderText: true,
                autoHeaderHeight: true,
                valueGetter: (p: any) => {
                    const total = p.data?.voucherInfo?.totalVouchers || 0;
                    const approved = p.data?.voucherInfo?.accountsApproved || 0;
                    return total - approved;
                },
                filter: "agNumberColumnFilter",
                width: 160,
                cellStyle: { textAlign: "center" },
            },
            {
                headerName: "Admin Pending",
                wrapHeaderText: true,
                autoHeaderHeight: true,
                valueGetter: (p: any) => {
                    const total = p.data?.voucherInfo?.totalVouchers || 0;
                    const approved = p.data?.voucherInfo?.adminApproved || 0;
                    return total - approved;
                },
                filter: "agNumberColumnFilter",
                width: 160,
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
                <Card className="overflow-hidden border shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-0">
                        <div className="p-3 pb-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-chart-3/10 rounded-lg text-chart-3 ring-1 ring-inset ring-chart-3/20">
                                    <IndianRupee className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">{currentFinancialYear}</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount Received</p>
                                <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatINR(totals.current.received)}</h3>
                            </div>
                        </div>
                        {totals.previous.map(prev => (
                            <div key={prev.fyStartYear} className="bg-muted/30 border-t px-3 py-1.5 flex justify-between items-center">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{prev.financialYear}</span>
                                <span className="text-[11px] font-bold text-foreground">{formatINR(prev.received)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-0">
                        <div className="p-3 pb-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary ring-1 ring-inset ring-primary/20">
                                    <Receipt className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">{currentFinancialYear}</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount Spent</p>
                                <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatINR(totals.current.spent)}</h3>
                            </div>
                        </div>
                        {totals.previous.map(prev => (
                            <div key={prev.fyStartYear} className="bg-muted/30 border-t px-3 py-1.5 flex justify-between items-center">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{prev.financialYear}</span>
                                <span className="text-[11px] font-bold text-foreground">{formatINR(prev.spent)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-0">
                        <div className="p-3 pb-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-chart-2/10 rounded-lg text-chart-2 ring-1 ring-inset ring-chart-2/20">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">{currentFinancialYear}</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount Approved</p>
                                <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatINR(totals.current.approved)}</h3>
                            </div>
                        </div>
                        {totals.previous.map(prev => (
                            <div key={prev.fyStartYear} className="bg-muted/30 border-t px-3 py-1.5 flex justify-between items-center">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{prev.financialYear}</span>
                                <span className="text-[11px] font-bold text-foreground">{formatINR(prev.approved)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-0">
                        <div className="p-3 pb-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-chart-5/10 rounded-lg text-chart-5 ring-1 ring-inset ring-chart-5/20">
                                    <LayoutDashboard className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">{currentFinancialYear}</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount Left</p>
                                <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatINR(totals.current.left)}</h3>
                            </div>
                        </div>
                        {totals.previous.map(prev => (
                            <div key={prev.fyStartYear} className="bg-muted/30 border-t px-3 py-1.5 flex justify-between items-center">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{prev.financialYear}</span>
                                <span className="text-[11px] font-bold text-foreground">{formatINR(prev.left)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* VOUCHER SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="overflow-hidden border shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-0">
                        <div className="p-3 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-lg text-muted-foreground ring-1 ring-inset ring-border/50">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Vouchers</p>
                                    <p className="text-2xl font-bold text-foreground tracking-tight leading-none mt-1">{totals.current.totalVouchers}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{currentFinancialYear}</span>
                        </div>
                        {totals.previous.map(prev => (
                            <div key={prev.fyStartYear} className="bg-muted/30 border-t px-3 py-1.5 flex justify-between items-center">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{prev.financialYear}</span>
                                <span className="text-[11px] font-bold text-foreground">{prev.totalVouchers}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-0">
                        <div className="p-3 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary ring-1 ring-inset ring-primary/20">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Accounts Approved</p>
                                    <p className="text-2xl font-bold text-foreground tracking-tight leading-none mt-1">{totals.current.accountsApproved}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{currentFinancialYear}</span>
                        </div>
                        {totals.previous.map(prev => (
                            <div key={prev.fyStartYear} className="bg-muted/30 border-t px-3 py-1.5 flex justify-between items-center">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{prev.financialYear}</span>
                                <span className="text-[11px] font-bold text-foreground">{prev.accountsApproved}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border shadow-sm transition-all hover:shadow-md">
                    <CardContent className="p-0">
                        <div className="p-3 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-chart-2/10 rounded-lg text-chart-2 ring-1 ring-inset ring-chart-2/20">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Admin Approved</p>
                                    <p className="text-2xl font-bold text-foreground tracking-tight leading-none mt-1">{totals.current.adminApproved}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{currentFinancialYear}</span>
                        </div>
                        {totals.previous.map(prev => (
                            <div key={prev.fyStartYear} className="bg-muted/30 border-t px-3 py-1.5 flex justify-between items-center">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{prev.financialYear}</span>
                                <span className="text-[11px] font-bold text-foreground">{prev.adminApproved}</span>
                            </div>
                        ))}
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
