import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Trash, Plus, Loader2, Receipt, FileSearch } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
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

const ImprestPaymentHistory: React.FC = () => {
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
                label: "View Voucher",
                icon: <Receipt className="h-4 w-4" />,
                className: "text-blue-600",
                onClick: null,
            },
            {
                label: "View Proof",
                icon: <FileSearch className="h-4 w-4" />,
                className: "text-blue-600",
                onClick: null,
            },
        ],
        [handleDelete]
    );

    /**
     * Column definitions
     */

    //Employee Name	Voucher Period	Voucher Amount	Accountant Approval	Admin Approval	Buttons
    //valueGetter: p => (p.data?.created_at ? new Date(p.data.created_at).toLocaleDateString("en-GB") : "-"),
    const columns: ColDef[] = useMemo(
        () => [
            {
                field: "employee_name",
                headerName: "Employee Name",
                width: 120,
            },
            { field: "voucher_period", headerName: "Voucher Period", width: 160 },
            {
                field: "voucher_amount",
                headerName: "Voucher Amount",
                width: 120,
                valueFormatter: p => formatINR(p.value ?? 0),
            },
            {
                field: "amount",
                headerName: "Amount",
                width: 120,
                valueFormatter: p => formatINR(p.value ?? 0),
            },
            { field: "accountant_approval", headerName: "Accountant Approval", width: 160 },
            { field: "admin_approval", headerName: "Admin Approval", width: 160 },
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
                        <CardTitle>Employee Imprest Voucher</CardTitle>
                        <CardDescription>
                            {rows.length} record{rows.length !== 1 ? "s" : ""} found
                        </CardDescription>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={() => navigate(paths.shared.imprest)}>Back</Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Data Table */}
                    <DataTable data={rows} loading={isLoading} columnDefs={columns} gridOptions={{ pagination: true }} />
                </CardContent>
            </Card>
        </div>
    );
};

export default ImprestPaymentHistory;
