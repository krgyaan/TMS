import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Eye, ArrowLeft } from "lucide-react";

import { useImprestVoucherList } from "./imprest.hooks";
import type { ImprestVoucherRow } from "./imprest.types";
import { paths } from "@/app/routes/paths";
import { useUser } from "@/hooks/api/useUsers";

const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

const ImprestVoucherList: React.FC = () => {
    const navigate = useNavigate();

    // ✅ Read query param
    const [searchParams] = useSearchParams();
    const userIdParam = searchParams.get("userId");
    const queryUserId = userIdParam ? Number(userIdParam) : undefined;

    const safeUserId = queryUserId ?? 0;

    const { data: userDetails } = useUser(safeUserId);

    // ✅ Fetch vouchers
    const { data: rows = [], isLoading } = useImprestVoucherList(queryUserId);

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
            // ✅ Employee / Beneficiary column
            { field: "beneficiaryName", headerName: "Employee" },

            // ✅ Voucher Period column (Year + Week + Range)
            {
                headerName: "Voucher Period",
                autoHeight: true,
                cellStyle: { whiteSpace: "pre-line" },
                valueGetter: (p: any) => {
                    const formatDate = (d: string) =>
                        new Date(d).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        });

                    return `Year: ${p.data.year}
                        Week: ${p.data.week}
                        ${formatDate(p.data.validFrom)} - ${formatDate(p.data.validTo)}`;
                },
            },

            {
                field: "amount",
                headerName: "Amount",
                valueFormatter: (p: any) => formatINR(p.value),
            },

            {
                field: "accountantApproval",
                headerName: "Accountant Approval",
                autoHeight: true,
                cellRenderer: (p: any) => {
                    const remark = p.data?.accountantRemark;

                    return (
                        <div className="flex flex-col gap-1">
                            {p.value ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded w-fit">Approved</span>
                            ) : (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded w-fit">Pending</span>
                            )}

                            {remark && <div className="text-xs text-muted-foreground font-semibold">{remark}</div>}
                        </div>
                    );
                },
            },

            {
                field: "adminApproval",
                headerName: "Admin Approval",
                autoHeight: true,
                cellRenderer: (p: any) => {
                    const remark = p.data?.adminRemark;

                    return (
                        <div className="flex flex-col gap-1">
                            {p.value ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded w-fit">Approved</span>
                            ) : (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded w-fit">Pending</span>
                            )}

                            {remark && <div className="text-xs text-muted-foreground font-semibold">{remark}</div>}
                        </div>
                    );
                },
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
                <div className="flex items-center justify-between">
                    <CardTitle>{queryUserId ? `Imprest Vouchers - ${userDetails?.name ?? ""}` : "Imprest Vouchers"}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => navigate(paths.accounts.imprests)}>
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                <DataTable data={rows} columnDefs={columns as any} gridOptions={{ pagination: true }} loading={isLoading} />
            </CardContent>
        </Card>
    );
};

export default ImprestVoucherList;
