// ImprestEmployeeDashboard.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { data, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DataTable from "@/components/ui/data-table";

import { Trash2, Plus, Loader2, CheckCircle, ListChecks, FileCheck, MessageSquarePlus, ImagePlus, Download, Eye, AlertCircle } from "lucide-react";

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
    const { userId } = useParams<{ userId?: string }>();

    const numericUserId = userId ? Number(userId) : undefined;

    const { data: rows = [], isLoading, error } = useImprestList(numericUserId);

    const deleteMutation = useDeleteImprest();
    const uploadProofsMutation = useUploadImprestProofs();
    const approveMutation = useApproveImprest();
    const tallyMutation = useTallyImprest();
    const proofMutation = useProofImprest();

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

    const handleDelete = useCallback(
        (row: ImprestRow) => {
            if (confirm("Are you sure you want to delete this record?")) {
                deleteMutation.mutate(row.id);
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
        setLightboxSlides(row.invoiceProof.map(filename => ({ src: `/uploads/employee-imprest/${filename}` })));
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
                                disabled={approveMutation.isPending}
                            />
                            <StatusToggle
                                active={row.tallyStatus === 1}
                                label="Tallied"
                                icon={ListChecks}
                                onClick={() => tallyMutation.mutate(row.id)}
                                disabled={tallyMutation.isPending}
                            />
                            <StatusToggle
                                active={row.proofStatus === 1}
                                label="Proof Verified"
                                icon={FileCheck}
                                onClick={() => proofMutation.mutate(row.id)}
                                disabled={proofMutation.isPending}
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
                            <IconAction icon={Trash2} label="Delete" onClick={() => handleDelete(row)} variant="destructive" />
                        </div>
                    );
                },
            },
        ],
        [approveMutation, tallyMutation, proofMutation, handleDelete]
    );

    /* -------------------- RENDER -------------------- */

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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle>Imprests</CardTitle>
                    <CardDescription>
                        {rows.length} {rows.length === 1 ? "record" : "records"}
                    </CardDescription>
                </div>

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

                    <Button variant="outline" size="sm" onClick={exportExcel}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button size="sm" onClick={() => navigate(paths.shared.imprestCreate)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Imprest
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
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
            </CardContent>

            {/* Upload Proof Dialog */}
            <Dialog open={addProofOpen} onOpenChange={setAddProofOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Proof</DialogTitle>
                        <DialogDescription>Select one or more files to upload as proof documents.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitAddProof} className="space-y-4">
                        <div className="space-y-2">
                            <Input type="file" multiple accept="image/*,.pdf" onChange={e => setFilesToUpload(Array.from(e.target.files ?? []))} />
                            {filesToUpload.length > 0 && (
                                <p className="text-xs ">
                                    {filesToUpload.length} {filesToUpload.length === 1 ? "file" : "files"} selected
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setAddProofOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={filesToUpload.length === 0 || uploadProofsMutation.isPending}>
                                {uploadProofsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Upload
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
