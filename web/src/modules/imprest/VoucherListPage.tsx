import { paths } from "@/app/routes/paths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useImprestVoucherList } from "@/hooks/api/imprest.hooks";
import { useUser } from "@/hooks/api/useUsers";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { ColDef } from "ag-grid-community";
import { ArrowLeft, Eye } from "lucide-react";
import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ImprestVoucherRow } from "./helpers/imprest.types";

const formatFY = (startYear: number) => `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;

const ImprestVoucherList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId: userIdParam } = useParams<{ userId?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const isAccountsSection = location.pathname.includes("/accounts/");

    const queryUserId = userIdParam && !isNaN(Number(userIdParam)) ? Number(userIdParam) : undefined;
    const safeUserId = queryUserId ?? 0;
    const { data: userDetails } = useUser(safeUserId);

    const { pagination, setPagination, search, setSearch, debouncedSearch } = usePersistentTableState({
        storageKey: "imprest-vouchers",
        defaultTab: "" as const,
    });

    const fyParam = searchParams.get("fy");
    const fyFromUrl: "all" | number | undefined =
        fyParam === null ? undefined : fyParam === "all" ? "all" : Number(fyParam);
    const effectiveFY = typeof fyFromUrl === "number" && !Number.isNaN(fyFromUrl) ? fyFromUrl : undefined;

    const { data, isLoading } = useImprestVoucherList(queryUserId, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch || undefined,
        fy: effectiveFY,
    });

    const rows = data?.data ?? [];
    const totalRows = data?.meta?.total ?? 0;
    const fyOptions = data?.fyOptions ?? [];

    const selectValue = fyFromUrl ?? fyOptions[0] ?? "all";

    const handleFyChange = (value: string) => {
        const next = new URLSearchParams(searchParams);
        next.set("fy", value);
        setSearchParams(next, { replace: true });
        setPagination(p => ({ ...p, pageIndex: 0 }));
    };

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
                width: 80,
                maxWidth: 80,
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
                    <CardTitle>{queryUserId ? `${userDetails?.name ?? ""}'s Vouchers` : "Imprest Vouchers"}</CardTitle>
                    <div className="flex items-center gap-3">
                        <Input
                            placeholder="Search vouchers..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-64"
                        />
                        <Select value={String(selectValue)} onValueChange={handleFyChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {fyOptions.map(fy => (
                                    <SelectItem key={fy} value={String(fy)}>
                                        {formatFY(fy)}
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
                <DataTable
                    data={rows}
                    columnDefs={columns}
                    manualPagination
                    paginationState={pagination}
                    onPaginationChange={setPagination}
                    rowCount={totalRows}
                    loading={isLoading}
                    gridOptions={{ headerHeight: 44, suppressCellFocus: true }}
                />
            </CardContent>
        </Card>
    );
};

export default ImprestVoucherList;
