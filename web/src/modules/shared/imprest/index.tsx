import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Trash, Plus, Loader2 } from "lucide-react";
import { RowContainerCtrl, type ColDef } from "ag-grid-community";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Image, File } from "lucide-react";

import { paths } from "@/app/routes/paths";

// ⬅ NEW IMPORTS FROM YOUR MODULE
import { useImprestList, useDeleteImprest, useUpdateImprest, useUploadImprestProofs } from "./imprest.hooks";

import type { ImprestRow } from "./imprest.types";

/** INR formatter */
const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

const ImprestEmployeeDashboard: React.FC = () => {
    const navigate = useNavigate();

    /**
     * Query Hooks (React Query)
     */
    const { data: rows = [], isLoading, error } = useImprestList();
    const deleteMutation = useDeleteImprest();
    const updateMutation = useUpdateImprest();
    const uploadProofsMutation = useUploadImprestProofs();

    /**
     * Local UI State
     */
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([]);
    const [addProofOpen, setAddProofOpen] = useState(false);
    const [currentProofRowId, setCurrentProofRowId] = useState<number | null>(null);
    const [remarkOpen, setRemarkOpen] = useState(false);
    const [remarkText, setRemarkText] = useState("");
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

    const [startDate, setStartDate] = useState<string>();
    const [endDate, setEndDate] = useState<string>();

    /**
     * Summary Cards
     */
    const amtReceived = useMemo(() => rows.reduce((s, r) => s + (r.amount ?? 0), 0) + 50000, [rows]);
    const amtSpent = useMemo(() => rows.reduce((s, r) => s + (r.amount ?? 0), 0), [rows]);
    const amtApproved = useMemo(() => rows.filter(r => r.approval_status === 1).reduce((s, r) => s + (r.amount ?? 0), 0), [rows]);
    const amtLeft = useMemo(() => amtReceived - amtSpent, [amtReceived, amtSpent]);

    /**
     * Delete handler (Uses deleteMutation)
     */
    const handleDelete = useCallback(
        (row: ImprestRow) => {
            if (!confirm("Are you sure you want to delete this record?")) return;
            deleteMutation.mutate(row.id);
        },
        [deleteMutation]
    );

    /**
     * Update handler
     */
    const handleUpdate = useCallback(
        (id: number, data: Partial<ImprestRow>) => {
            updateMutation.mutate({ id, data });
        },
        [updateMutation]
    );

    /**
     * Proof upload modal
     */
    const openAddProof = (rowId: number) => {
        setCurrentProofRowId(rowId);
        setAddProofOpen(true);
    };

    const submitAddProof = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentProofRowId || filesToUpload.length === 0) return;

        uploadProofsMutation.mutate({ id: currentProofRowId, files: filesToUpload }, { onSuccess: () => setAddProofOpen(false) });
    };

    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files ? Array.from(e.target.files) : [];
        setFilesToUpload(f);
    };

    /**
     * Lightbox
     */

    const openLightboxForRow = (row: ImprestRow, startIndex = 0) => {
        const slides = (row.invoice_proof ?? []).map(p => ({
            src: p.url,
            type: p.type, // "image" or "file"
            name: p.name,
        }));

        setLightboxSlides(slides);
        setLightboxOpen(true);
    };

    /**
     * AG Grid Action Items
     */
    const actionItems = useMemo(
        () => [
            {
                label: "Proof",
                icon: <Plus className="h-4 w-4" />,
                onClick: (row: ImprestRow) => openAddProof(row.id),
            },
            {
                label: "Delete",
                icon: <Trash className="h-4 w-4" />,
                className: "text-red-600",
                onClick: handleDelete,
            },
        ],
        [handleDelete]
    );

    const exportExcel = () => {
        if (!rows || rows.length === 0) return;

        // Transform rows into plain JSON for Excel
        const excelData = rows.map(r => ({
            Date: r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "-",
            "Party Name": r.party_name,
            "Project Name": r.project_name,
            Amount: r.amount,
            Category: r.category,
            Remarks: r.remark,
            Status: r.approval_status === 1 ? "Approved" : "Pending",
            "Proof Count": r.invoice_proof?.length ?? 0,
        }));

        // Convert JSON → worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Imprest Records");

        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

        // Download
        const fileBlob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        saveAs(fileBlob, `Imprest_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    /**
     * Column definitions
     */
    const columns: ColDef[] = useMemo(
        () => [
            {
                field: "created_at",
                headerName: "Date",
                width: 120,
                valueGetter: p => (p.data?.created_at ? new Date(p.data.created_at).toLocaleDateString("en-GB") : "-"),
            },
            { field: "party_name", headerName: "Party Name", width: 160 },
            { field: "project_name", headerName: "Project Name", width: 160 },
            {
                field: "amount",
                headerName: "Amount",
                width: 120,
                valueFormatter: p => formatINR(p.value ?? 0),
            },
            { field: "category", headerName: "Category", width: 160 },
            {
                field: "invoice_proof",
                headerName: "Proof",
                width: 140,
                cellRenderer: p => {
                    const row: ImprestRow = p.data;
                    const count = row.invoice_proof?.length ?? 0;
                    if (count === 0) return "-";

                    return (
                        <button className="text-blue-600 underline cursor-pointer" onClick={() => openLightboxForRow(row)}>
                            View Proofs ({count})
                        </button>
                    );
                },
            },
            { field: "remark", headerName: "Remarks", width: 200 },
            {
                field: "approval_status",
                headerName: "Status",
                width: 120,
                cellRenderer: p => {
                    const status = p.data?.approval_status;
                    return (
                        <span className={`px-2 py-1 rounded text-xs ${status === 1 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                            {status === 1 ? "Approved" : "Pending"}
                        </span>
                    );
                },
            },
            {
                headerName: "Action",
                width: 180,
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(actionItems),
            },
        ],
        [actionItems]
    );

    /**
     * Loading & errors
     */
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading imprests...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-600">Error: {String(error)}</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    /**
     * UI render
     */
    return (
        <div>
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <div>
                        <CardTitle>My Imprests</CardTitle>
                        <CardDescription>
                            {rows.length} record{rows.length !== 1 ? "s" : ""} found
                        </CardDescription>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={() => navigate(paths.shared.imprestCreate)}>Add Imprest</Button>
                        <Button onClick={() => navigate(paths.shared.ImprestPaymentHistory)} variant="secondary">
                            Payment History
                        </Button>
                        <Button variant="outline" onClick={() => navigate(paths.shared.ImprestVoucher)}>
                            Imprest Voucher
                        </Button>
                        <Button variant="secondary" onClick={() => exportExcel()}>
                            Download Excel
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-4 rounded shadow border">
                            <h6 className="text-sm font-semibold">Amount Received</h6>
                            <p className="text-lg font-medium">{formatINR(amtReceived)}</p>
                        </div>
                        <div className="p-4 rounded shadow border">
                            <h6 className="text-sm font-semibold">Amount Spent</h6>
                            <p className="text-lg font-medium">{formatINR(amtSpent)}</p>
                        </div>
                        <div className="p-4 rounded shadow border">
                            <h6 className="text-sm font-semibold">Amount Approved</h6>
                            <p className="text-lg font-medium">{formatINR(amtApproved)}</p>
                        </div>
                        <div className="p-4 rounded shadow border">
                            <h6 className="text-sm font-semibold">Amount Left</h6>
                            <p className="text-lg font-medium">{formatINR(amtLeft)}</p>
                        </div>
                    </div>

                    {/* Data Table */}
                    <DataTable data={rows} loading={isLoading} columnDefs={columns} gridOptions={{ pagination: true }} />
                </CardContent>
            </Card>

            {/* Add Proof Modal */}
            <Dialog open={addProofOpen} onOpenChange={setAddProofOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Proof</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submitAddProof} className="grid gap-4">
                        <div>
                            <label className="text-sm">Invoice/Proof (multiple)</label>
                            <Input type="file" multiple onChange={handleFilesSelected} />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setAddProofOpen(false)}>
                                Close
                            </Button>
                            <Button type="submit">Save changes</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Lightbox */}
            {lightboxOpen && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={lightboxSlides}
                    render={{
                        slide: ({ slide }) =>
                            slide.type === "image" ? (
                                <img src={slide.src} style={{ maxWidth: "100%", maxHeight: "100%" }} />
                            ) : (
                                <iframe src={slide.src} style={{ width: "100%", height: "100%" }} title={slide.name} />
                            ),
                    }}
                />
            )}
        </div>
    );
};

export default ImprestEmployeeDashboard;
