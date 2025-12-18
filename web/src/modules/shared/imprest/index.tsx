// ImprestEmployeeDashboard.tsx
import React, { useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";

import { Trash, Plus, Loader2, CheckCircle, ListChecks, FileCheck, MessageSquarePlus, Badge } from "lucide-react";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { paths } from "@/app/routes/paths";
import { useImprestList, useDeleteImprest, useUploadImprestProofs, useApproveImprest, useTallyImprest, useProofImprest } from "./imprest.hooks";

import type { ImprestRow } from "./imprest.types";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** INR formatter */
const formatINR = (num: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);

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

    const [remarkOpen, setRemarkOpen] = useState(false);
    const [remarkRow, setRemarkRow] = useState<ImprestRow | null>(null);

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
        setAddProofOpen(true);
    };

    const submitAddProof = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentProofRowId || filesToUpload.length === 0) return;

        uploadProofsMutation.mutate({ id: currentProofRowId, files: filesToUpload }, { onSuccess: () => setAddProofOpen(false) });
    };

    const submitAddRemark = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!remarkRow) return;
    };

    const openLightboxForRow = (row: ImprestRow) => {
        setLightboxSlides(row.invoiceProof.map(p => ({ src: p.url })));
        setLightboxOpen(true);
    };

    const openRemarkModal = (row: ImprestRow) => {
        setRemarkRow(row);
        setRemarkOpen(true);
    };

    /* -------------------- ACTIONS -------------------- */

    const actionItems = useMemo(
        () => [
            {
                label: "Approve",
                icon: <CheckCircle className="h-4 w-4 text-green-600" />,
                hidden: (row: ImprestRow) => row.approvalStatus === 1,
                onClick: (row: ImprestRow) => approveMutation.mutate(row.id),
            },
            {
                label: "Tally",
                icon: <ListChecks className="h-4 w-4 text-blue-600" />,
                hidden: (row: ImprestRow) => row.tallyStatus === 1,
                onClick: (row: ImprestRow) => tallyMutation.mutate(row.id),
            },
            {
                label: "Proof OK",
                icon: <FileCheck className="h-4 w-4 text-purple-600" />,
                hidden: (row: ImprestRow) => row.proofStatus === 1,
                onClick: (row: ImprestRow) => proofMutation.mutate(row.id),
            },
            {
                label: "Add Remark",
                icon: <MessageSquarePlus className="h-4 w-4 text-orange-600" />,
                onClick: openRemarkModal,
            },
            {
                label: "Add Proof",
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
        [approveMutation, tallyMutation, proofMutation, handleDelete]
    );

    /* -------------------- EXCEL -------------------- */

    const exportExcel = () => {
        const excelData = rows.map(r => ({
            Date: new Date(r.createdAt).toLocaleDateString("en-GB"),
            Party: r.partyName,
            Project: r.projectName,
            Amount: r.amount,
            Approved: r.approvalStatus === 1 ? "Yes" : "No",
            Proofs: r.invoiceProof.length,
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Imprest");

        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf]), `Imprest_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    /* -------------------- COLUMNS -------------------- */

    const columns = useMemo(
        () => [
            {
                field: "createdAt",
                headerName: "Date",
                valueGetter: p => new Date(p.data.createdAt).toLocaleDateString("en-GB"),
            },
            { field: "partyName", headerName: "Party" },
            { field: "projectName", headerName: "Project" },
            {
                field: "amount",
                headerName: "Amount",
                valueFormatter: p => formatINR(p.value),
            },
            {
                field: "invoiceProof",
                headerName: "Proof",
                cellRenderer: p => {
                    const row = p.data as ImprestRow;
                    return row.invoiceProof.length ? (
                        <button className="text-blue-600 underline" onClick={() => openLightboxForRow(row)}>
                            View ({row.invoiceProof.length})
                        </button>
                    ) : (
                        "-"
                    );
                },
            },
            {
                headerName: "Status",
                cellRenderer: p => {
                    const row = p.data as ImprestRow;

                    const Chip = ({ ok, label, Icon, activeClass }: { ok: boolean; label: string; Icon: any; activeClass: string }) => (
                        <div
                            className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap", ok ? activeClass : "bg-gray-100 text-gray-400")}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{label}</span>
                        </div>
                    );

                    return (
                        <div className="flex items-center gap-2">
                            <Chip ok={row.approvalStatus === 1} label="Approved" Icon={CheckCircle} activeClass="bg-green-100 text-green-700" />

                            <Chip ok={row.tallyStatus === 1} label="Tallied" Icon={ListChecks} activeClass="bg-blue-100 text-blue-700" />

                            <Chip ok={row.proofStatus === 1} label="Proof OK" Icon={FileCheck} activeClass="bg-purple-100 text-purple-700" />
                        </div>
                    );
                },
            },
            { headerName: "Action", cellRenderer: createActionColumnRenderer(actionItems), sortable: false, filter: false },
        ],
        [actionItems]
    );

    /* -------------------- UI -------------------- */

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin" />
                <span className="ml-2">Loading…</span>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-600 text-center">Failed to load imprests</div>;
    }

    return (
        <Card>
            <CardHeader className="flex justify-between items-center">
                <div>
                    <CardTitle>My Imprests</CardTitle>
                    <CardDescription>{rows.length} records</CardDescription>
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => navigate(paths.shared.imprestCreate)}>Add Imprest</Button>
                    <Button variant="secondary" onClick={exportExcel}>
                        Download Excel
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                <DataTable data={rows} columnDefs={columns} gridOptions={{ pagination: true }} />
            </CardContent>

            {/* ADD PROOF MODAL */}
            <Dialog open={addProofOpen} onOpenChange={setAddProofOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Proof</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submitAddProof} className="space-y-4">
                        <Input type="file" multiple onChange={e => setFilesToUpload(Array.from(e.target.files ?? []))} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => setAddProofOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Upload</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ADD REMARK MODAL */}
            <Dialog open={remarkOpen} onOpenChange={setRemarkOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Remark</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submitAddRemark} className="space-y-4">
                        <Textarea />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => setRemarkOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Upload</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {lightboxOpen && <Lightbox open close={() => setLightboxOpen(false)} slides={lightboxSlides} />}
        </Card>
    );
};

export default ImprestEmployeeDashboard;
