// src/pages/project-dashboard/ProjectDashboard.tsx

import React, { useState, useMemo, useCallback } from "react";
import { 
    Download, 
    Eye, 
    Plus, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    X, 
    FileText, 
    Image as ImageIcon,
    ExternalLink,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Maximize2,
    AlertCircle,
    Edit
} from "lucide-react";

/* UI Components */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription 
} from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useNavigate, useSearchParams } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { useProjectDashboardDetails } from "./project-dashboard.hooks";
import { FormProvider, useForm } from "react-hook-form";
import SelectField from "@/components/form/SelectField";
import { cn } from "@/lib/utils";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { GridApi } from "ag-grid-community";
import {ProofViewer, type ProofViewerProps} from "./components/ProofViewer"

/* ================================
   UTILITY FUNCTIONS
================================ */
const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "-";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getStatusVariant = (status: string | number): "default" | "secondary" | "destructive" | "outline" => {
    if (status == 1 || status === "1" || status === "approved") return "default";
    if (status == 0 || status === "0" || status === "pending") return "secondary";
    if (status === "rejected") return "destructive";
    return "secondary";
};

const getStatusLabel = (status: string | number): string => {
    if (status == "1" || status === "1") return "Approved";
    if (status == "0" || status === "0") return "Pending";
    return String(status);
};

/* ================================
   STAT CARD COMPONENT
================================ */
interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: "up" | "down" | "neutral";
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
            <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                </p>
                <p className="text-xl font-bold tabular-nums tracking-tight">
                    {value || "-"}
                </p>
            </div>
            {icon && (
                <div className="rounded-lg bg-primary/10 p-2">
                    {icon}
                </div>
            )}
        </div>
    </div>
);


/* ================================
   MAIN COMPONENT
================================ */
export default function ProjectDashboardPage() {
    const [searchParams] = useSearchParams();

    const id = searchParams.get("id"); // string | null

    const form = useForm<{ projectId: number | null }>({
        defaultValues: { projectId: id },
    });

    const projectId = form.watch("projectId");
    const navigate = useNavigate();
    
    // Grid APIs for search
    const [poGridApi, setPoGridApi] = useState<GridApi | null>(null);
    const [woGridApi, setWoGridApi] = useState<GridApi | null>(null);
    const [imprestGridApi, setImprestGridApi] = useState<GridApi | null>(null);
    
    // Search states
    const [imprestSearch, setImprestSearch] = useState("");
    
    // Proof viewer state
    const [proofViewerOpen, setProofViewerOpen] = useState(false);
    const [selectedProofs, setSelectedProofs] = useState<string[]>([]);
    const [selectedImprestInfo, setSelectedImprestInfo] = useState<{
        employee: string;
        amount: number;
        category: string;
        partyName?: string;
        remark?: string;
    } | null>(null);

    const { data: projects = [] } = useProjectsMaster();
    const { data: projectDetails, isLoading } = useProjectDashboardDetails(projectId);

    console.log(projectDetails);

    const woBasicDetail = projectDetails?.woBasicDetail ?? {};
    const imprests = projectDetails?.imprests ?? [];
    const purchaseOrders = projectDetails?.purchaseOrders ?? [];

    // Handle view proofs
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

    /* -------------------- PO COLUMNS -------------------- */
    const poActions: ActionItem<any>[] = [
        {
            label: "Raise Payment",
            onClick: (row) => console.log("Raise payment for", row.id),
        },
        {
            label: "View Details",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.viewPoPage(row.id)),
        },
        {
            label: "Edit PO",
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => navigate(paths.operations.editPoPage(row.id)),
        },
        {
            label: "Download PO",
            icon: <Download className="h-4 w-4" />,
            onClick: (row) => console.log("Download PO", row.id),
        },
    ];

    const poColumns = useMemo(() => [
        {
            field: "poNumber",
            headerName: "PO Number",
            sortable: true,
            filter: true,
            cellRenderer: (p: any) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
        },
        {
            field: "createdAt",
            headerName: "Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "sellerName",
            headerName: "Party Name",
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 150,
            cellRenderer: (p: any) => (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate block max-w-[200px]">{p.value || "-"}</span>
                        </TooltipTrigger>
                        <TooltipContent>{p.value}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ),
        },
        {
            field: "amount",
            headerName: "Amount",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatCurrency(p.value),
            cellClass: "tabular-nums font-medium",
        },
        {
            field: "amountPaid",
            headerName: "Amount Paid",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatCurrency(p.value),
            cellClass: "tabular-nums",
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<any>(poActions),
            width: 80,
            pinned: "right",
        },
    ], [navigate]);

    /* -------------------- WO COLUMNS -------------------- */
    const woActions: ActionItem<any>[] = [
        {
            label: "WO Acceptance",
            onClick: (row) => console.log("Accept WO", row),
        },
        {
            label: "WO Update",
            onClick: (row) => console.log("Update WO", row),
        },
        {
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => console.log("View WO", row),
        },
    ];

    const woData = useMemo(() => {
        if (!woBasicDetail.number) return [];
        return [woBasicDetail];
    }, [woBasicDetail]);

    const woColumns = useMemo(() => [
        {
            field: "number",
            headerName: "WO Number",
            sortable: true,
            filter: true,
            cellRenderer: (p: any) => (
                <span className="font-mono text-sm font-medium">{p.value || "-"}</span>
            ),
        },
        {
            field: "parGst",
            headerName: "WO Value",
            sortable: true,
            filter: "agNumberColumnFilter",
            type: "numericColumn",
            valueFormatter: (p: any) => formatCurrency(p.value),
            cellClass: "tabular-nums font-medium",
        },
        {
            field: "ldStartDate",
            headerName: "LD Start Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "maxLdDate",
            headerName: "Max LD Date",
            sortable: true,
            filter: true,
            valueFormatter: (p: any) => formatDate(p.value),
        },
        {
            field: "pbgApplicable",
            headerName: "PBG",
            sortable: true,
            filter: true,
            width: 100,
            cellRenderer: (p: any) => (
                <Badge variant={p.value ? "default" : "secondary"} className="text-xs">
                    {p.value ? "Yes" : "No"}
                </Badge>
            ),
        },
        {
            field: "contractAgreement",
            headerName: "Contract",
            sortable: true,
            filter: true,
            width: 100,
            cellRenderer: (p: any) => (
                <Badge variant={p.value ? "default" : "secondary"} className="text-xs">
                    {p.value ? "Yes" : "No"}
                </Badge>
            ),
        },
        {
            headerName: "Actions",
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer<any>(woActions),
            width: 80,
            pinned: "right",
        },
    ], []);

    /* -------------------- IMPREST COLUMNS -------------------- */
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
            valueFormatter: (p: any) => formatCurrency(p.value),
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

    /* -------------------- RENDER -------------------- */
    if (isLoading && !projectId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background">
                <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Project Dashboard
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage and monitor your project details
                            </p>
                        </div>
                    </div>

                    {/* Project Selection */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <FormProvider {...form}>
                                        <SelectField
                                            control={form.control}
                                            name="projectId"
                                            label="Select Project"
                                            placeholder="-- Select Project --"
                                            options={projects.map((p: any) => ({
                                                id: String(p.id),
                                                name: p.projectName,
                                            }))}
                                        />
                                    </FormProvider>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {projectId && isLoading && (
                        <Card>
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                    <p className="text-sm text-muted-foreground">
                                        Loading project details...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {projectDetails && !projectDetails?.tender && (
                        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center gap-5">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm group-hover:scale-105 transition-transform">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold">Tender Not Linked</h3>
                                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 px-1.5 border-primary/20 text-primary bg-primary/5">
                                            Action Required
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                        This project does not have a linked tender record. Linking a tender is essential for accurate budget tracking, compliance monitoring, and automated work order generation.
                                    </p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="hidden md:flex gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                    Link Tender
                                </Button>
                            </div>
                            <div className="absolute -right-10 -bottom-6 opacity-[0.03] text-foreground pointer-events-none">
                                <AlertCircle size={120} />
                            </div>
                        </div>
                    )}

                    {projectId && projectDetails && (
                        <>
                            {/* Project Overview Stats */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Project Overview
                                        </CardTitle>
                                        <CardDescription>
                                            Financial summary and key metrics
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => navigate(paths.operations.raisePoForm(projectId))}
                                        >
                                            <Plus className="mr-1.5 h-4 w-4" /> 
                                            Raise PO
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Plus className="mr-1.5 h-4 w-4" /> 
                                            Raise WO
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatCard
                                            label="WO Value (Pre GST)"
                                            value={projectDetails?.woBasicDetail?.woValuePreGst 
                                                ? formatCurrency(Number(projectDetails?.woBasicDetail?.woValuePreGst)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="WO Value (GST)"
                                            value={projectDetails?.woBasicDetail?.woValueGstAmt 
                                                ? formatCurrency(Number(projectDetails?.woBasicDetail?.woValueGstAmt)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="Total Budget"
                                            value={projectDetails?.woBasicDetail?.budget 
                                                ? formatCurrency(Number(woBasicDetail?.budget)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="Expenses Done"
                                            value={projectDetails?.woBasicDetail?.expenses_done 
                                                ? formatCurrency(Number(woBasicDetail?.expenses_done)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="PO Raised"
                                            value={projectDetails?.woBasicDetail?.poRaised 
                                                ? formatCurrency(Number(projectDetails?.woBasicDetail?.poRaised)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="WO Raised"
                                            value={projectDetails?.woBasicDetail?.woRaised 
                                                ? formatCurrency(Number(woBasicDetail?.woRaised)) 
                                                : "-"}
                                        />
                                        <StatCard
                                            label="Planned GP"
                                            value="-"
                                        />
                                        <StatCard
                                            label="Actual GP"
                                            value="-"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Purchase Orders Table */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Purchase Orders
                                        </CardTitle>
                                        <CardDescription>
                                            {purchaseOrders.length} order{purchaseOrders.length !== 1 ? 's' : ''} found
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <DataTable
                                        data={purchaseOrders}
                                        columnDefs={poColumns}
                                        onGridReady={(params) => setPoGridApi(params.api)}
                                        gridOptions={{
                                            pagination: true,
                                            paginationPageSize: 5,
                                            domLayout: 'autoHeight',
                                        }}
                                    />
                                </CardContent>
                            </Card>

                            {/* Work Orders Table */}
                            <Card>
                                <CardHeader className="pb-4">
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Work Orders
                                        </CardTitle>
                                        <CardDescription>
                                            {woData.length} order{woData.length !== 1 ? 's' : ''} found
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <DataTable
                                        data={woData}
                                        columnDefs={woColumns}
                                        onGridReady={(params) => setWoGridApi(params.api)}
                                        gridOptions={{
                                            domLayout: 'autoHeight',
                                        }}
                                    />
                                </CardContent>
                            </Card>

                            {/* Employee Imprests Table */}
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
                                                    {formatCurrency(Number(projectDetails.imprestSum || 0))}
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
                                            paginationPageSize: 10,
                                            paginationPageSizeSelector: [5, 10, 20, 50],
                                            domLayout: 'autoHeight',
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Empty State */}
                    {!projectId && (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">No Project Selected</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-sm">
                                    Select a project from the dropdown above to view its dashboard and details.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Proof Viewer Sheet */}
                <ProofViewer
                    isOpen={proofViewerOpen}
                    onClose={() => setProofViewerOpen(false)}
                    proofs={selectedProofs}
                    imprestInfo={selectedImprestInfo || undefined}
                />
            </div>
        </TooltipProvider>
    );
}