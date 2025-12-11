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
    // const { data: rows = [], isLoading, error } = useImprestList();

    const isLoading = false;
    const error = null;

    const rows: ImprestRow[] = [
        {
            id: 1,
            sr_no: 1,
            team_member_name: "John Doe",
            created_at: "2025-01-01",
            amount: 1200,
            project_name: "Project Alpha",
            category: "Travel",
            remark: "Cab to airport",
            approval_status: 1,
            invoice_proof: [
                {
                    url: "https://picsum.photos/400",
                    type: "image",
                    name: "receipt1.jpg",
                },
            ],
        },
        {
            id: 2,
            sr_no: 2,
            team_member_name: "Jane Smith",
            created_at: "2025-01-03",
            amount: 2400,
            project_name: "Beta Build",
            category: "Food",
            remark: "Client lunch",
            approval_status: 0,
            invoice_proof: [],
        },
    ];

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
     * AG Grid Action Items
     */
    const actionItems = useMemo(
        () => [
            {
                label: "Delete",
                icon: <Trash className="h-4 w-4" />,
                className: "text-red-600",
                onClick: handleDelete,
            },
        ],
        [handleDelete]
    );

    /**
     * Column definitions
     */
    const columns: ColDef[] = useMemo(
        () => [
            {
                field: "sr_no",
                headerName: "Sr. No.",
                width: 120,
            },
            { field: "team_member_name", headerName: "Name", width: 160 },
            {
                field: "date",
                headerName: "Date",
                width: 120,
                valueGetter: p => (p.data?.created_at ? new Date(p.data.created_at).toLocaleDateString("en-GB") : "-"),
            },
            {
                field: "amount",
                headerName: "Amount",
                width: 120,
                valueFormatter: p => formatINR(p.value ?? 0),
            },
            { field: "project_name", headerName: "Project Name", width: 160 },
            { field: "category", headerName: "Category", width: 160 },
            { field: "remark", headerName: "Remarks", width: 200 },
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
                        <CardTitle>Payment History</CardTitle>
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
