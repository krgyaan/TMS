import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Receipt, FileSearch, Loader2 } from "lucide-react";
import type { ColDef } from "ag-grid-community";

import { paths } from "@/app/routes/paths";

/** ------------------------
 * Dummy Data
 * ------------------------ */
const dummyRows = [
    {
        id: 1,
        employee_name: "Abhijeet Gaur",
        voucher_period: "Jan 2025",
        voucher_amount: 12000,
        accountant_approval: "Approved",
        admin_approval: "Pending",
    },
    {
        id: 2,
        employee_name: "John Doe",
        voucher_period: "Feb 2025",
        voucher_amount: 8000,
        accountant_approval: "Approved",
        admin_approval: "Approved",
    },
];

/** INR formatter */
const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

const ImprestVoucher: React.FC = () => {
    const navigate = useNavigate();

    // Fake loading simulation
    const [loading] = useState(false);

    /** ------------------------
     * Action Buttons
     * ------------------------ */
    const actionItems = useMemo(
        () => [
            {
                label: "View Voucher",
                icon: <Receipt className="h-4 w-4" />,
                className: "text-blue-600",
                onClick: (row: any) => {
                    console.log("Voucher clicked:", row);
                    navigate(paths.shared.imprestVoucherView ?? "/voucher");
                },
            },
            {
                label: "View Proof",
                icon: <FileSearch className="h-4 w-4" />,
                className: "text-blue-600",
                onClick: (row: any) => {
                    console.log("Proof clicked:", row);
                    navigate(paths.shared.imprestProofView ?? "/proof");
                },
            },
        ],
        [navigate]
    );

    /** ------------------------
     * AG Grid Column Definitions
     * ------------------------ */
    const columns: ColDef[] = useMemo(
        () => [
            { field: "employee_name", headerName: "Employee Name", width: 150 },
            { field: "voucher_period", headerName: "Voucher Period", width: 150 },
            {
                field: "voucher_amount",
                headerName: "Voucher Amount",
                width: 150,
                valueFormatter: p => formatINR(p.value ?? 0),
            },
            { field: "accountant_approval", headerName: "Accountant Approval", width: 170 },
            { field: "admin_approval", headerName: "Admin Approval", width: 150 },
            {
                headerName: "Actions",
                width: 180,
                sortable: false,
                filter: false,
                cellRenderer: createActionColumnRenderer(actionItems),
            },
        ],
        [actionItems]
    );

    /** ------------------------
     * Loading UI
     * ------------------------ */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading vouchers...</span>
            </div>
        );
    }

    return (
        <div>
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <div>
                        <CardTitle>Employee Imprest Voucher</CardTitle>
                        <CardDescription>
                            {dummyRows.length} record{dummyRows.length !== 1 ? "s" : ""} found
                        </CardDescription>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={() => navigate(paths.shared.imprest ?? "/imprest")}>Back</Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <DataTable data={dummyRows} loading={loading} columnDefs={columns} gridOptions={{ pagination: true }} />
                </CardContent>
            </Card>
        </div>
    );
};

export default ImprestVoucher;
