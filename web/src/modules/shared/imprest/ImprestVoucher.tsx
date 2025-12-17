import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Eye } from "lucide-react";

import { useImprestVoucherList } from "./imprest.hooks";
import type { ImprestVoucherRow } from "./imprest.types";
import { paths } from "@/app/routes/paths";

const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

const ImprestVoucherList: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    console.log("UserId from params:", id);

    const parsedUserId = id ? Number(id) : undefined;

    console.log("parsedUserId:", parsedUserId);

    const { data: rows = [], isLoading } = useImprestVoucherList(parsedUserId);
    console.log("Fetched vouchers:", rows);
    const actionItems = useMemo(
        () => [
            {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: ImprestVoucherRow) => navigate(paths.shared.imprestVoucherView(row.id)),
            },
        ],
        [navigate]
    );

    const columns = useMemo(
        () => [
            { field: "voucherCode", headerName: "Voucher No" },
            {
                field: "validFrom",
                headerName: "Period",
                valueGetter: p => `${new Date(p.data.validFrom).toLocaleDateString("en-GB")} - ${new Date(p.data.validTo).toLocaleDateString("en-GB")}`,
            },
            {
                field: "amount",
                headerName: "Amount",
                valueFormatter: p => formatINR(p.value),
            },
            {
                field: "accountantApproval",
                headerName: "Accountant Approval",
                cellRenderer: p =>
                    p.value ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Approved</span>
                    ) : (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Pending</span>
                    ),
            },
            {
                field: "adminApproval",
                headerName: "Admin Approval",
                cellRenderer: p =>
                    p.value ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Approved</span>
                    ) : (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Pending</span>
                    ),
            },
            {
                headerName: "Action",
                cellRenderer: createActionColumnRenderer(actionItems),
            },
        ],
        [actionItems]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Imprest Vouchers</CardTitle>
            </CardHeader>

            <CardContent>
                <DataTable data={rows} columnDefs={columns as any} gridOptions={{ pagination: true }} loading={isLoading} />
            </CardContent>
        </Card>
    );
};

export default ImprestVoucherList;
