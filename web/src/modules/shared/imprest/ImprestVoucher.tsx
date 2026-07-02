import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Eye, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

    const [selectedFY, setSelectedFY] = useState<string>("");

    // Helper to calculate financial year (e.g. 2024-25) for a date string
    const getFinancialYearForDate = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = d.getMonth();
        const startYear = month >= 3 ? year : year - 1;
        const endYear = (startYear + 1) % 100;
        return `${startYear}-${String(endYear).padStart(2, "0")}`;
    };

    // Extract unique available financial years
    const availableFYs = useMemo(() => {
        const years = new Set<string>();
        rows.forEach((r: any) => {
            if (r.validFrom) {
                const fy = getFinancialYearForDate(r.validFrom);
                if (fy) {
                    years.add(fy);
                }
            }
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [rows]);

    // Set the latest year as default once availableFYs load
    useEffect(() => {
        if (availableFYs.length > 0 && selectedFY === "") {
            setSelectedFY(availableFYs[0]);
        }
    }, [availableFYs, selectedFY]);

    // Filter rows client-side
    const filteredRows = useMemo(() => {
        const activeFY = selectedFY || availableFYs[0] || "all";
        if (activeFY === "all") return rows;
        return rows.filter((r: any) => {
            if (!r.validFrom) return false;
            return getFinancialYearForDate(r.validFrom) === activeFY;
        });
    }, [rows, selectedFY, availableFYs]);
    // console.log(rows);

    const actionItems = useMemo(
        () => [
            {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: ImprestVoucherRow) =>
                    navigate(
                        paths.shared.imprestVoucherView({
                            userId: Number(row.beneficiaryId), // ✅ numeric
                            from: row.validFrom,
                            to: row.validTo,
                        }),
                        { state: { proofs: row.proofs } }
                    ),
            },
        ],
        [navigate]
    );
    const columns = useMemo(
        () => [
            // ✅ Employee / Beneficiary column
            { field: "beneficiaryName", headerName: "Employee" },
            {
                field: "voucherNumber",
                headerName: "Voucher No.",
                valueGetter: (p: any) => {
                    return p.data?.voucherCode ? p.data.voucherCode : "-";
                },
            },
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
                    const remark = p.data?.accountsRemark;

                    return (
                        <div className="flex flex-col gap-1 py-2">
                            {p.value ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded w-fit">Approved</span>
                            ) : (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded w-fit">Pending</span>
                            )}

                            {remark && <div className="text-xs text-muted-foreground font-semibold text-wrap py-2">{remark}</div>}
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
                        <div className="flex flex-col gap-1 py-2">
                            {p.value ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded w-fit">Approved</span>
                            ) : (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded w-fit">Pending</span>
                            )}

                            {remark && <div className="text-xs text-muted-foreground font-semibold text-wrap py-2">{remark}</div>}
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
                    <div className="flex items-center gap-3">
                        <Select value={selectedFY || availableFYs[0] || "all"} onValueChange={setSelectedFY}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableFYs.map(fy => (
                                    <SelectItem key={fy} value={fy}>
                                        {fy}
                                    </SelectItem>
                                ))}
                                <SelectItem value="all">All Years</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => navigate(paths.accounts.imprests)}>
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <DataTable data={filteredRows} columnDefs={columns as any} gridOptions={{ pagination: true }} loading={isLoading} />
            </CardContent>
        </Card>
    );
};

export default ImprestVoucherList;
