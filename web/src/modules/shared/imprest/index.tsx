// ImprestEmployeeDashboard.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { data, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DataTable from "@/components/ui/data-table";

import { Trash2, Plus, Loader2, CheckCircle, ListChecks, FileCheck, MessageSquarePlus, ImagePlus, Download, Eye, AlertCircle, ArrowLeft } from "lucide-react";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { paths } from "@/app/routes/paths";
import { useImprestList, useDeleteImprest, useUploadImprestProofs, useApproveImprest, useTallyImprest, useProofImprest } from "./imprest.hooks";

import type { ImprestRow } from "./imprest.types";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { GridApi } from "ag-grid-community";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/api/useUsers";

/** INR formatter */
const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

/** Inline Status Toggle */
const StatusToggle: React.FC<{
    active: boolean;
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    disabled?: boolean;
}> = ({ active, label, icon: Icon, onClick, disabled }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        if (!active && !disabled) onClick();
                    }}
                    disabled={disabled}
                    className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Icon className="h-4 w-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
                {active ? label : `Mark as ${label}`}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

/** Icon Action Button */
const IconAction: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive";
    disabled?: boolean;
}> = ({ icon: Icon, label, onClick, variant = "default", disabled }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        onClick();
                    }}
                    disabled={disabled}
                    className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        variant === "destructive"
                            ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Icon className="h-4 w-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
                {label}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const ImprestEmployeeDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, hasPermission, canUpdate } = useAuth();
    const { id } = useParams<{ id?: string }>();
    const [isMobile, setIsMobile] = useState(false);

    let userDetails = null;

    const canMutateStatus = canUpdate("shared.imprests");

    const isAuthorized = hasPermission("shared.imprests", "read");

    const requestedUserId = id ? Number(id) : null;
    const isOwnPage = !requestedUserId || requestedUserId === user?.id;

    console.log(requestedUserId, isOwnPage);

    if (requestedUserId) {
        userDetails = useUser(requestedUserId).data;
    }

    console.log("user details", userDetails);

    if (!isOwnPage && !isAuthorized) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm font-medium">Access Denied</p>
                    <p className="text-xs text-muted-foreground">You do not have permission to view this user's imprests.</p>
                </CardContent>
            </Card>
        );
    }

    const numericUserId = isOwnPage ? user?.id : requestedUserId;
    console.log(numericUserId);

    const { data, isLoading, error } = useImprestList(numericUserId);

    const summary = data?.summary;
    console.log("summary", { summary });
    const rows = data?.imprests ?? [];

    const deleteMutation = useDeleteImprest();
    const uploadProofsMutation = useUploadImprestProofs();
    const approveMutation = useApproveImprest();
    const tallyMutation = useTallyImprest();
    const proofMutation = useProofImprest();

    const MOBILE_PAGE_SIZE = 10;

    const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([]);
    const [addProofOpen, setAddProofOpen] = useState(false);
    const [currentProofRowId, setCurrentProofRowId] = useState<number | null>(null);
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [searchText, setSearchText] = useState("");
    const [gridApi, setGridApi] = useState<GridApi | null>(null);

    const [remarkOpen, setRemarkOpen] = useState(false);
    const [remarkRow, setRemarkRow] = useState<ImprestRow | null>(null);
    const [remarkText, setRemarkText] = useState("");

    /* -------------------- HANDLERS -------------------- */

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 768px)");
        const handler = () => setIsMobile(mq.matches);
        handler();
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const handleDelete = useCallback(
        (row: ImprestRow) => {
            if (confirm("Are you sure you want to delete this record?")) {
                deleteMutation.mutate(row.id);
                2;
            }
        },
        [deleteMutation]
    );

    const openAddProof = (id: number) => {
        setCurrentProofRowId(id);
        setFilesToUpload([]);
        setAddProofOpen(true);
    };

    const submitAddProof = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentProofRowId || filesToUpload.length === 0) return;
        console.log("data", filesToUpload);
        uploadProofsMutation.mutate(
            { id: currentProofRowId, files: filesToUpload },
            {
                onSuccess: () => {
                    setAddProofOpen(false);
                    setFilesToUpload([]);
                },
            }
        );
    };

    const openRemarkModal = (row: ImprestRow) => {
        setRemarkRow(row);
        setRemarkText("");
        setRemarkOpen(true);
    };

    const submitAddRemark = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!remarkRow || !remarkText.trim()) return;
        // Add your remark mutation here
        setRemarkOpen(false);
    };

    const openLightboxForRow = (row: ImprestRow) => {
        setLightboxSlides(row.invoiceProof.map(filename => ({ src: `/uploads/employeeimprest/${filename}` })));
        setLightboxOpen(true);
    };

    /* -------------------- EXCEL -------------------- */

    const exportExcel = () => {
        const excelData = rows.map(r => ({
            Date: new Date(r.createdAt).toLocaleDateString("en-GB"),
            Party: r.partyName,
            Project: r.projectName,
            Amount: r.amount,
            Approved: r.approvalStatus === 1 ? "Yes" : "No",
            Tallied: r.tallyStatus === 1 ? "Yes" : "No",
            "Proof Verified": r.proofStatus === 1 ? "Yes" : "No",
            "Proof Count": r.invoiceProof.length,
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Imprest");

        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf]), `Imprest_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    useEffect(() => {
        console.log("QuickFilter:", searchText);
    }, [searchText]);

    useEffect(() => {
        setVisibleCount(MOBILE_PAGE_SIZE);
    }, [rows]);

    const StatusChip = ({ done, doneText, pendingText, color }: { done: boolean; doneText: string; pendingText: string; color: "green" | "blue" | "purple" }) => {
        const colorMap = {
            green: done ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200",
            blue: done ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-yellow-50 text-yellow-700 border-yellow-200",
            purple: done ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-yellow-50 text-yellow-700 border-yellow-200",
        };

        return <button className={cn("px-2 py-1 rounded-full text-[11px] border font-medium", colorMap[color])}>{done ? doneText : pendingText}</button>;
    };

    /* -------------------- COLUMNS -------------------- */

    const columns = useMemo(
        () => [
            {
                field: "createdAt",
                headerName: "Date",
                width: 100,
                valueGetter: p => new Date(p.data.createdAt).toLocaleDateString("en-GB"),
            },
            {
                field: "partyName",
                headerName: "Party",
                flex: 1,
                minWidth: 140,
            },
            {
                field: "projectName",
                headerName: "Project",
                flex: 1,
                minWidth: 140,
            },
            {
                field: "amount",
                headerName: "Amount",
                width: 120,
                valueFormatter: p => formatINR(p.value),
                cellClass: "font-medium tabular-nums",
            },
            {
                field: "invoiceProof",
                headerName: "Proofs",
                width: 90,
                sortable: false,
                cellRenderer: p => {
                    const row = p.data as ImprestRow;
                    if (!row.invoiceProof.length) {
                        return <span className="text-muted-foreground">—</span>;
                    }
                    return (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline" onClick={() => openLightboxForRow(row)}>
                                        <Eye className="h-3.5 w-3.5" />
                                        {row.invoiceProof.length}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs font-medium">
                                    View proofs
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                },
            },
            {
                headerName: "Status",
                width: 140,
                sortable: false,
                filter: false,
                cellRenderer: p => {
                    const row = p.data as ImprestRow;

                    return (
                        <div className="flex items-center gap-1">
                            <StatusToggle
                                active={row.approvalStatus === 1}
                                label="Approved"
                                icon={CheckCircle}
                                onClick={() => approveMutation.mutate(row.id)}
                                disabled={!canMutateStatus || approveMutation.isPending}
                            />

                            <StatusToggle
                                active={row.tallyStatus === 1}
                                label="Tallied"
                                icon={ListChecks}
                                onClick={() => tallyMutation.mutate(row.id)}
                                disabled={!canMutateStatus || tallyMutation.isPending}
                            />

                            <StatusToggle
                                active={row.proofStatus === 1}
                                label="Proof Verified"
                                icon={FileCheck}
                                onClick={() => proofMutation.mutate(row.id)}
                                disabled={!canMutateStatus || proofMutation.isPending}
                            />
                        </div>
                    );
                },
            },
            {
                headerName: "Actions",
                width: 130,
                sortable: false,
                filter: false,
                cellRenderer: p => {
                    const row = p.data as ImprestRow;

                    return (
                        <div className="flex items-center gap-1">
                            <IconAction icon={MessageSquarePlus} label="Add Remark" onClick={() => openRemarkModal(row)} />
                            <IconAction icon={ImagePlus} label="Add Proof" onClick={() => openAddProof(row.id)} />
                            {canUpdate("imprests.shared") && <IconAction icon={Trash2} label="Delete" onClick={() => handleDelete(row)} variant="destructive" />}
                        </div>
                    );
                },
            },
        ],
        [approveMutation, tallyMutation, proofMutation, handleDelete]
    );

    /* -------------------- RENDER -------------------- */

    const ImprestMobileCard: React.FC<{ row: ImprestRow }> = ({ row }) => {
        const proofCount = row.invoiceProof.length;

        return (
            <div className="border rounded-xl p-3 mb-3 bg-background shadow-sm">
                {/* Top row: Party + Amount */}
                <div className="flex justify-between items-center">
                    <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{row.partyName}</p>
                        <p className="text-xs text-muted-foreground truncate">{row.projectName}</p>
                    </div>
                    <p className="font-semibold text-sm tabular-nums">{formatINR(row.amount)}</p>
                </div>

                {/* Meta row */}
                <div className="flex justify-between items-center mt-2 text-[11px] text-muted-foreground">
                    <span>{new Date(row.createdAt).toLocaleDateString("en-GB")}</span>

                    {proofCount > 0 && (
                        <button onClick={() => openLightboxForRow(row)} className="flex items-center gap-1 text-primary">
                            <Eye className="h-3.5 w-3.5" />
                            {proofCount} proof{proofCount > 1 && "s"}
                        </button>
                    )}
                </div>

                {/* Status chips */}
                <div className="flex gap-2 mt-3 flex-wrap">
                    <StatusChip done={row.approvalStatus === 1} doneText="Approved" pendingText="Approval Pending" color="green" />

                    <StatusChip done={row.tallyStatus === 1} doneText="Tallied" pendingText="Tally Pending" color="blue" />

                    <StatusChip done={row.proofStatus === 1} doneText="Verified" pendingText="Proof Pending" color="purple" />
                </div>

                {/* Actions row */}
                <div className="flex justify-end gap-3 mt-3 pt-2 border-t">
                    <IconAction icon={ImagePlus} label="Add Proof" onClick={() => openAddProof(row.id)} />
                    <IconAction icon={MessageSquarePlus} label="Add Remark" onClick={() => openRemarkModal(row)} />
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-64">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading imprests…</span>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm font-medium">Failed to load imprests</p>
                    <p className="text-xs text-muted-foreground">Please try again later</p>
                </CardContent>
            </Card>
        );
    }

    const pageTitle = isOwnPage ? "My Imprests" : `${userDetails?.name ?? "User"}'s Imprests`;

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="space-y-4">
                    {/* Top Row: Back + Title */}
                    <div className={cn("flex items-start gap-2", isMobile ? "flex-col" : "flex-row items-center justify-between")}>
                        {/* Left Side: Back + Title */}
                        <div className="flex items-center gap-2">
                            {!isOwnPage && (
                                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}

                            <div>
                                <CardTitle className="leading-none">{pageTitle}</CardTitle>
                                <CardDescription className="mt-1">
                                    {rows.length} {rows.length === 1 ? "record" : "records"}
                                </CardDescription>
                            </div>
                        </div>

                        {/* Right Side Controls (Desktop Only) */}
                        {!isMobile && (
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Search imprests..."
                                    value={searchText}
                                    onChange={e => {
                                        const value = e.target.value;
                                        setSearchText(value);
                                        gridApi?.setGridOption("quickFilterText", value);
                                    }}
                                    className="w-64"
                                />

                                <Button size="sm" onClick={() => navigate(paths.shared.imprestCreate)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Imprest
                                </Button>

                                <Button size="sm" onClick={() => navigate(paths.shared.imprestVoucherByUser(numericUserId))}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    View Vouchers
                                </Button>

                                <Button variant="outline" size="sm" onClick={exportExcel}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Controls */}
                    {isMobile && (
                        <div className="flex flex-col gap-2">
                            <Input
                                placeholder="Search imprests..."
                                value={searchText}
                                onChange={e => {
                                    const value = e.target.value;
                                    setSearchText(value);
                                    gridApi?.setGridOption("quickFilterText", value);
                                }}
                                className="w-full"
                            />

                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => navigate(paths.shared.imprestCreate)} className="flex-1">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>

                                <Button variant="outline" size="sm" onClick={exportExcel} className="flex-1">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>

            {/* SUMMARY */}
            {/* ================= FINANCIAL SUMMARY ================= */}
            {summary && (
                <div className="mx-3 p-4">
                    {isMobile ? (
                        /* ================= MOBILE ================= */
                        <Card className="border shadow-sm">
                            <CardContent className="p-5 space-y-3">
                                {/* Primary Balance */}
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground ">Amount Left</p>
                                    <p className="text-2xl font-semibold tabular-nums mt-1">{formatINR(summary.amountLeft)}</p>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Financial Breakdown */}
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Amount Spent</span>
                                        <span className="font-medium tabular-nums">{formatINR(summary.amountSpent)}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Amount Approved</span>
                                        <span className="font-medium tabular-nums">{formatINR(summary.amountApproved)}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Amount Received</span>
                                        <span className="font-medium tabular-nums">{formatINR(summary.amountReceived)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        /* ================= DESKTOP ================= */
                        <Card className="border shadow-sm">
                            <CardContent className="p-2 pl-5">
                                <div className="grid grid-cols-4 gap-3 items-center">
                                    {/* Supporting Metrics */}
                                    <div className="col-span-3 grid grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Amount Spent</p>
                                            <p className="text-lg font-medium tabular-nums mt-2">{formatINR(summary.amountSpent)}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Amount Approved</p>
                                            <p className="text-lg font-medium tabular-nums mt-2">{formatINR(summary.amountApproved)}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Amount Received</p>
                                            <p className="text-lg font-medium tabular-nums mt-2">{formatINR(summary.amountReceived)}</p>
                                        </div>
                                    </div>

                                    {/* Balance (Primary) */}
                                    <div className="col-span-1 ">
                                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Amount Left</p>
                                        <p className="text-xl font-semibold tabular-nums mt-2">{formatINR(summary.amountLeft)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <CardContent>
                {isMobile ? (
                    <div className="mt-2">
                        {rows.map(row => (
                            <ImprestMobileCard key={row.id} row={row} />
                        ))}
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        columnDefs={columns}
                        onGridReady={params => {
                            setGridApi(params.api);
                            params.api.setQuickFilter(searchText);
                        }}
                        gridOptions={{
                            pagination: true,
                            paginationPageSize: 20,
                            rowHeight: 48,
                            headerHeight: 44,
                            suppressCellFocus: true,
                            onGridReady: params => {
                                setGridApi(params.api);
                            },
                        }}
                    />
                )}
            </CardContent>

            {/* Upload Proof Dialog */}
            <Dialog open={addProofOpen} onOpenChange={setAddProofOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Upload Proof Documents</DialogTitle>
                        <DialogDescription>Drag & drop files here or click to browse. Supported: images and PDF.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitAddProof} className="space-y-6">
                        {/* Dropzone */}
                        <label
                            htmlFor="proof-upload"
                            className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/50 transition"
                        >
                            <div className="text-muted-foreground">
                                <p className="font-medium">Click to upload files here</p>
                                <p className="text-xs mt-1">PNG, JPG, PDF allowed</p>
                            </div>

                            <Input
                                id="proof-upload"
                                type="file"
                                multiple
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={e => setFilesToUpload(Array.from(e.target.files ?? []))}
                            />
                        </label>

                        {/* Selected files preview */}
                        {filesToUpload.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-auto border rounded-md p-3 bg-muted/30">
                                <p className="text-sm font-medium">
                                    {filesToUpload.length} file{filesToUpload.length > 1 && "s"} selected
                                </p>

                                <ul className="text-xs space-y-1">
                                    {filesToUpload.map((file, idx) => (
                                        <li key={idx} className="flex justify-between items-center bg-background px-2 py-1 rounded border">
                                            <span className="truncate">{file.name}</span>
                                            <span className="text-muted-foreground ml-2">{(file.size / 1024).toFixed(1)} KB</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setAddProofOpen(false)}>
                                Cancel
                            </Button>

                            <Button type="submit" disabled={filesToUpload.length === 0 || uploadProofsMutation.isPending}>
                                {uploadProofsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Upload Files
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Remark Dialog */}
            <Dialog open={remarkOpen} onOpenChange={setRemarkOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Remark</DialogTitle>
                        <DialogDescription>Add a note or comment for this imprest record.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitAddRemark} className="space-y-4">
                        <Textarea value={remarkText} onChange={e => setRemarkText(e.target.value)} placeholder="Enter your remark…" rows={4} />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setRemarkOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!remarkText.trim()}>
                                Save
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Lightbox */}
            {lightboxOpen && <Lightbox open close={() => setLightboxOpen(false)} slides={lightboxSlides} />}
        </Card>
    );
};

export default ImprestEmployeeDashboard;
