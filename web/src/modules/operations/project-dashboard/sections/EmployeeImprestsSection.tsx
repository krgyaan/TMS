import React, { useCallback, useMemo, useState } from "react";
import { Image as ImageIcon, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { GridApi } from "ag-grid-community";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { useProjectImprests } from "@/hooks/api/useProjectDashboard";
import { ProofViewer } from "../components/ProofViewer";

interface EmployeeImprestsSectionProps {
    projectId: number | null;
}

export const EmployeeImprestsSection: React.FC<EmployeeImprestsSectionProps> = ({
    projectId,
}) => {
    const [imprestGridApi, setImprestGridApi] = useState<GridApi | null>(null);
    const [imprestSearch, setImprestSearch] = useState("");
    const [proofViewerOpen, setProofViewerOpen] = useState(false);
    const [selectedProofs, setSelectedProofs] = useState<string[]>([]);
    const [selectedImprestInfo, setSelectedImprestInfo] = useState<{
        employee: string;
        amount: number;
        category: string;
        partyName?: string;
        remark?: string;
    } | null>(null);

    const { data, isLoading } = useProjectImprests(projectId!);
    const imprests = data?.imprests ?? [];
    const imprestSum = data?.imprestSum ?? 0;

    const handleViewProofs = useCallback((imprest: any) => {
        setSelectedProofs(imprest.proof || []);
        setSelectedImprestInfo({
            employee: imprest.userName,
            amount: imprest.amount,
            category: imprest.category,
            partyName: imprest.partyName,
            remark: imprest.remark,
        });
        setProofViewerOpen(true);
    }, []);

    const imprestColumns = useMemo(() => [
        {
            field: "userName",
            headerName: "Employee",
            sortable: true,
            filter: true,
            minWidth: 130,
            cellRenderer: (p: any) => (
                <span className="font-medium truncate block">{p.value || "-"}</span>
            ),
        },
        {
            field: "partyName",
            headerName: "Party",
            sortable: true,
            filter: true,
            minWidth: 140,
            cellRenderer: (p: any) => {
                const value = p.value;
                if (!value) return <span className="text-muted-foreground">-</span>;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block max-w-[130px]">{value}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top">{value}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "amount",
            headerName: "Amount",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            width: 120,
            valueFormatter: (p: any) => formatINR(p.value),
            cellClass: "tabular-nums font-semibold",
        },
        {
            field: "category",
            headerName: "Category",
            sortable: true,
            filter: true,
            width: 120,
            cellRenderer: (p: any) => (
                <Badge variant="outline" className="text-xs font-normal">
                    {p.value || "-"}
                </Badge>
            ),
        },
        {
            field: "remark",
            headerName: "Remark",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
            cellRenderer: (p: any) => {
                const value = p.value;
                if (!value) return <span className="text-muted-foreground">-</span>;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate block max-w-[180px] text-muted-foreground">
                                    {value}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                {value}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            field: "approvalStatus",
            headerName: "Status",
            sortable: true,
            filter: true,
            width: 110,
            cellRenderer: (p: any) =>
                p.value == "1" ? (
                    <Badge variant="default" className="text-xs">
                        Approved
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">
                        Pending
                    </Badge>
                ),
        },
        {
            field: "approvalDate",
            headerName: "Approved",
            sortable: true,
            filter: true,
            width: 110,
            valueFormatter: (p: any) => formatDate(p.value),
            cellClass: "text-muted-foreground text-sm",
        },
        {
            field: "proof",
            headerName: "Proof",
            sortable: false,
            filter: false,
            width: 90,
            cellRenderer: (p: any) => {
                const proofs = p.value || [];
                if (proofs.length === 0) {
                    return <span className="text-muted-foreground text-xs">—</span>;
                }
                return (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 gap-1"
                        onClick={() => handleViewProofs(p.data)}
                    >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{proofs.length}</span>
                    </Button>
                );
            },
        },
    ], [handleViewProofs]);

    if (!projectId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-56 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <CardTitle className="text-base font-semibold">
                                Employee Imprests
                            </CardTitle>
                            <CardDescription>
                                {imprests.length} record{imprests.length !== 1 ? 's' : ''} found
                            </CardDescription>
                        </div>
                        {imprests.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                <span className="text-xs text-muted-foreground">Total:</span>
                                <span className="text-sm font-bold tabular-nums text-primary">
                                    {formatINR(Number(imprestSum || 0))}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search imprests..."
                                value={imprestSearch}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setImprestSearch(value);
                                    imprestGridApi?.setGridOption("quickFilterText", value);
                                }}
                                className="pl-9 w-64 h-9"
                            />
                            {imprestSearch && (
                                <button
                                    onClick={() => {
                                        setImprestSearch("");
                                        imprestGridApi?.setGridOption("quickFilterText", "");
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <DataTable
                        data={imprests}
                        columnDefs={imprestColumns}
                        onGridReady={(params) => {
                            setImprestGridApi(params.api);
                            params.api.setGridOption("quickFilterText", imprestSearch);
                        }}
                        gridOptions={{
                            pagination: true,
                            paginationPageSize: 20,
                            domLayout: 'autoHeight',
                        }}
                    />
                </CardContent>
            </Card>

            <ProofViewer
                isOpen={proofViewerOpen}
                onClose={() => setProofViewerOpen(false)}
                proofs={selectedProofs}
                imprestInfo={selectedImprestInfo || undefined}
            />
        </>
    );
};
