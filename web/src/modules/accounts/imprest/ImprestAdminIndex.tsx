// imprest-admin.index.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { Loader2, ExternalLink, Receipt, LayoutDashboard, FileText } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useEmployeeImprestSummary } from "./imprest-admin.hooks";
import type { EmployeeImprestSummary } from "./imprest-admin.types";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { useAuth } from "@/contexts/AuthContext";

import type { GridApi } from "ag-grid-community";
import { Input } from "@/components/ui/input";
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

    console.log("Rendering ImprestAdminIndex...");
    const loggedInUser = useAuth().user;
    const { isAdmin, isSuperUser } = useAuth();
    const isAuthorized = isAdmin || isSuperUser;
    const navigate = useNavigate();
    const { data = [], isLoading, error } = useEmployeeImprestSummary();

    const imprestActions: ActionItem<EmployeeImprestSummary>[] = [
        {
            label: "Dashboard",
            icon: <LayoutDashboard className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.imprestUser(row.userId)),
        },
        {
            label: "Payment History",
            icon: <Receipt className="h-4 w-4" />,
            className: "text-blue-600",
            onClick: row => navigate(paths.accounts.imprestPaymentHistory(row.userId)),
        },
        {
            label: "Voucher",
            icon: <FileText className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.imprestVoucher(row.userId)),
        },
    ];

    useEffect(() => {
        console.log("the employee text search", searchText);
    }, []);

    /* -------------------- GLOBAL SUMMARY -------------------- */
    const totals = useMemo(() => {
        return data.reduce(
            (acc, e) => {
                acc.received += e.amountReceived;
                acc.spent += e.amountSpent;
                acc.approved += e.amountApproved;
                acc.left += e.amountLeft;
                return acc;
            },
            { received: 0, spent: 0, approved: 0, left: 0 }
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
                        <a href={paths.shared.imprestUser(userId)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline inline-flex items-center gap-1">
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
                headerName: "Actions",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer<EmployeeImprestSummary>(imprestActions),
                width: 80,
                pinned: "right",
            },
            // {
            //     headerName: "Action",
            //     sortable: false,
            //     filter: false,
            //     cellRenderer: (p: any) => (
            //         <div className="flex gap-2">
            //             {/* <Button size="sm" onClick={() => navigate(paths.accounts.employeeImprestDashboard(p.data.userId))}> */}
            //             <Button size="sm">Dashboard</Button>

            //             {/* <Button size="sm" variant="secondary" onClick={() => navigate(paths.accounts.imprestPaymentHistory(p.data.userId))}> */}
            //             <Button size="sm" variant="secondary">
            //                 Payment History
            //             </Button>

            //             <Button size="sm" variant="outline">
            //                 {/* <Button size="sm" variant="outline" onClick={() => navigate(paths.accounts.imprestVoucher(p.data.userId))}> */}
            //                 Voucher
            //             </Button>
            //         </div>
            //     ),
            // },
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
                    <CardContent>
                        <h6>Amount Received</h6>
                        <p>{formatINR(totals.received)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <h6>Amount Spent</h6>
                        <p>{formatINR(totals.spent)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <h6>Amount Approved</h6>
                        <p>{formatINR(totals.approved)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <h6>Amount Left</h6>
                        <p>{formatINR(totals.left)}</p>
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
        </div>
    );
};

export default ImprestAdminIndex;
