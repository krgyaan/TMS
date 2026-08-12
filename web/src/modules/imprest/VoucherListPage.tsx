import { paths } from "@/app/routes/paths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useImprestVoucherList } from "@/hooks/api/imprest.hooks";
import { useUser } from "@/hooks/api/useUsers";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import type { ColDef } from "ag-grid-community";
import { ArrowLeft, Eye } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { ImprestVoucherRow } from "./helpers/imprest.types";

const ImprestVoucherList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isAccountsSection = location.pathname.includes("/accounts/");
    const userIdParam = searchParams.get("userId");
    const queryUserId = userIdParam ? Number(userIdParam) : undefined;
    const safeUserId = queryUserId ?? 0;
    const { data: userDetails } = useUser(safeUserId);
    const { data: rows = [], isLoading } = useImprestVoucherList(queryUserId);

    const [selectedFY, setSelectedFY] = useState<string>("");

    const getFinancialYearForDate = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = d.getMonth();
        const startYear = month >= 3 ? year : year - 1;
        const endYear = (startYear + 1) % 100;
        return `${startYear}-${String(endYear).padStart(2, "0")}`;
    };

    const availableFYs = useMemo(() => {
        const years = new Set<string>();
        rows.forEach((r: ImprestVoucherRow) => {
            if (r.validFrom) {
                const fy = getFinancialYearForDate(r.validFrom);
                if (fy) {
                    years.add(fy);
                }
            }
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [rows]);

    useEffect(() => {
        if (availableFYs.length > 0 && selectedFY === "") {
            setSelectedFY(availableFYs[0]);
        }
    }, [availableFYs, selectedFY]);

    const filteredRows = useMemo(() => {
        const activeFY = selectedFY || availableFYs[0] || "all";
        if (activeFY === "all") return rows;
        return rows.filter((r: ImprestVoucherRow) => {
            if (!r.validFrom) return false;
            return getFinancialYearForDate(r.validFrom) === activeFY;
        });
    }, [rows, selectedFY, availableFYs]);

    const columns = useMemo<ColDef<ImprestVoucherRow>[]>(
        () => [
            { field: "beneficiaryName", headerName: "Employee" },
            {
                field: "voucherNumber",
                headerName: "Voucher No.",
                valueGetter: p => {
                    return p.data?.voucherCode ? p.data.voucherCode : "-";
                },
            },
            {
                headerName: "Voucher Period",
                autoHeight: true,
                cellRenderer: p => {
                    return (
                        <div className="flex flex-col gap-1 py-2">
                            <span className="text-xs text-wrap text-emerald-400">
                                Week: {p.data.week}
                            </span>
                            <span className="text-xs text-wrap">
                                {formatDate(p.data.validFrom)} to
                            </span>
                            <span className="text-xs text-wrap">
                                {formatDate(p.data.validTo)}
                            </span>
                        </div>
                    );
                }
            },
            {
                field: "amount",
                headerName: "Amount",
                valueFormatter: p => formatINR(p.value),
            },
            {
                field: "accountantApproval",
                headerName: "Accountant Approval",
                autoHeight: true,
                cellRenderer: p => {
                    const remark = p.data?.accountsRemark;

                    return (
                        <div className="flex flex-col gap-1 py-2">
                            {p.value ? (
                                <Badge variant='success'>Approved</Badge>
                            ) : (
                                <Badge variant='destructive'>Pending</Badge>
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
                cellRenderer: p => {
                    const remark = p.data?.adminRemark;

                    return (
                        <div className="flex flex-col gap-1 py-2">
                            {p.value ? (
                                <Badge variant='success'>Approved</Badge>
                            ) : (
                                <Badge variant='destructive'>Pending</Badge>
                            )}

                            {remark && <div className="text-xs text-muted-foreground font-semibold text-wrap py-2">{remark}</div>}
                        </div>
                    );
                },
            },
            {
                headerName: "",
                cellRenderer: (p: { data: ImprestVoucherRow }) => (
                    <Button variant="default" size="sm" 
                        onClick={() => navigate(isAccountsSection ? paths.accounts.imprestsVoucherView({userId: Number(p.data.beneficiaryId), from: p.data.validFrom, to: p.data.validTo}) : paths.shared.imprestVoucherView({userId: Number(p.data.beneficiaryId), from: p.data.validFrom, to: p.data.validTo}), { state: { proofs: p.data.proofs } })}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                ),
            },
        ],
        [navigate, isAccountsSection]
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
                        <Button variant="outline" size="sm" onClick={() => navigate(isAccountsSection ? paths.accounts.imprests : paths.shared.imprest)}>
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <DataTable data={filteredRows} columnDefs={columns} gridOptions={{ pagination: true }} loading={isLoading} />
            </CardContent>
        </Card>
    );
};

export default ImprestVoucherList;
