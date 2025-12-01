import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Eye, Trash, CheckSquare, FileText, Plus, Loader2 } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { paths } from "@/app/routes/paths";

import { imprestApi, type ImprestRow } from "@/services/api/imprest.api";

// Helper: format INR
const formatINR = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(num);
};

const ImprestDetailsPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    // State for API data
    const [rows, setRows] = useState<ImprestRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch data on component mount
    useEffect(() => {
        const fetchImprests = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await imprestApi.getMyImprests();
                setRows(data);
            } catch (err: any) {
                console.error("Failed to fetch imprests:", err);
                setError(err.response?.data?.message || "Failed to fetch imprests");
            } finally {
                setIsLoading(false);
            }
        };

        fetchImprests();
    }, []);

    // Summary calculations
    const amtReceived = useMemo(() => rows.reduce((s, r) => s + (r.amount ?? 0), 0) + 50000, [rows]);
    const amtSpent = useMemo(() => rows.reduce((s, r) => s + (r.amount ?? 0), 0), [rows]);
    const amtApproved = useMemo(() => rows.filter(r => r.approval_status === 1).reduce((s, r) => s + (r.amount ?? 0), 0), [rows]);
    const amtLeft = useMemo(() => amtReceived - amtSpent, [amtReceived, amtSpent]);

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([]);

    // Modals state
    const [addProofOpen, setAddProofOpen] = useState(false);
    const [currentProofRowId, setCurrentProofRowId] = useState<number | null>(null);
    const [payImprestOpen, setPayImprestOpen] = useState(false);
    const [remarkOpen, setRemarkOpen] = useState(false);
    const [remarkText, setRemarkText] = useState("");

    // File inputs for add proof
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

    // Date filter values
    const [startDate, setStartDate] = useState<string | undefined>(undefined);
    const [endDate, setEndDate] = useState<string | undefined>(undefined);

    // Delete handler with API call
    const handleDelete = useCallback(async (row: ImprestRow) => {
        if (!confirm("Are you sure you want to delete this record?")) return;

        try {
            const result = await imprestApi.delete(row.id);
            if (result.success) {
                setRows(prev => prev.filter(r => r.id !== row.id));
            } else {
                alert("Failed to delete. You may not have permission.");
            }
        } catch (err: any) {
            console.error("Delete failed:", err);
            alert(err.response?.data?.message || "Failed to delete imprest");
        }
    }, []);

    // Update handler with API call
    const handleUpdate = useCallback(async (id: number, data: Partial<ImprestRow>) => {
        try {
            const updated = await imprestApi.update(id, data);
            if (updated) {
                setRows(prev => prev.map(r => (r.id === id ? updated : r)));
            }
        } catch (err: any) {
            console.error("Update failed:", err);
            alert(err.response?.data?.message || "Failed to update imprest");
        }
    }, []);

    const openAddProof = (rowId: number) => {
        setCurrentProofRowId(rowId);
        setAddProofOpen(true);
    };

    const submitAddProof = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentProofRowId) return;

        // TODO: Implement file upload to your backend
        // For now, just close the modal
        setFilesToUpload([]);
        setAddProofOpen(false);
    };

    const openRemarkModal = (row: ImprestRow) => {
        setRemarkText(row.remark ?? "");
        setCurrentProofRowId(row.id);
        setRemarkOpen(true);
    };

    const submitRemark = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentProofRowId) return;

        await handleUpdate(currentProofRowId, { remark: remarkText });
        setRemarkOpen(false);
    };

    const openLightboxForRow = (row: ImprestRow) => {
        const slides = (row.invoice_proof ?? []).filter(p => p.type === "image").map(p => ({ src: p.url }));
        if (slides.length === 0) return;
        setLightboxSlides(slides);
        setLightboxOpen(true);
    };

    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files ? Array.from(e.target.files) : [];
        setFilesToUpload(f);
    };

    // Action items for AG Grid
    const actionItems = useMemo(
        () => [
            {
                label: "Approve",
                icon: <CheckSquare className="h-4 w-4" />,
                onClick: (row: ImprestRow) => {
                    handleUpdate(row.id, {
                        // Toggle approval - you might need to add this to your UpdateDto
                    });
                },
            },
            {
                label: "Tally",
                icon: <FileText className="h-4 w-4" />,
                onClick: (row: ImprestRow) => {
                    // Toggle tally status
                },
            },
            {
                label: "Proof",
                icon: <Plus className="h-4 w-4" />,
                onClick: (row: ImprestRow) => openAddProof(row.id),
            },
            {
                label: "Remarks",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: ImprestRow) => openRemarkModal(row),
            },
            {
                label: "Delete",
                icon: <Trash className="h-4 w-4" />,
                className: "text-red-600",
                onClick: handleDelete,
            },
        ],
        [handleDelete, handleUpdate]
    );

    // Columns for AG Grid
    const columns: ColDef[] = useMemo(
        () => [
            {
                field: "created_at",
                headerName: "Date",
                width: 120,
                valueGetter: (p: any) => {
                    const date = p.data?.created_at;
                    if (!date) return "-";
                    return new Date(date).toLocaleDateString("en-GB");
                },
            },
            { field: "party_name", headerName: "Party Name", width: 160 },
            { field: "project_name", headerName: "Project Name", width: 160 },
            {
                field: "amount",
                headerName: "Amount",
                width: 120,
                valueFormatter: (p: any) => formatINR(p.value ?? 0),
            },
            { field: "category", headerName: "Category", width: 160 },
            {
                field: "invoice_proof",
                headerName: "Proof",
                width: 140,
                cellRenderer: (p: any) => {
                    const row: ImprestRow = p.data;
                    if (!row.invoice_proof || row.invoice_proof.length === 0) return "-";

                    return (
                        <div className="flex flex-col gap-1">
                            {row.invoice_proof.map((f, idx) => (
                                <div key={idx}>
                                    {f.type === "image" ? (
                                        <button className="text-blue-600 underline" onClick={() => openLightboxForRow(row)}>
                                            IMG-{idx + 1}
                                        </button>
                                    ) : (
                                        <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                            {f.name}
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                },
            },
            { field: "remark", headerName: "Remarks", width: 200 },
            {
                field: "approval_status",
                headerName: "Status",
                width: 120,
                cellRenderer: (p: any) => {
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
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(actionItems),
                width: 180,
            },
        ],
        [actionItems]
    );

    // Date filter handler
    const handleFilterSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        // TODO: Add date filter to your backend API
        // For now, filter locally
        console.log("Filter by", startDate, endDate);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading imprests...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-600">Error: {error}</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

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
                        <Button variant="outline" onClick={() => navigate("/shared/imprests")}>
                            Back
                        </Button>
                        <Button onClick={() => setPayImprestOpen(true)}>Pay Imprest</Button>
                        <Button onClick={() => navigate(paths.shared.createImprests)}>Add Imprest</Button>
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

                    {/* Date Filter */}
                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div>
                            <label className="block text-sm">From Date</label>
                            <Input type="date" value={startDate ?? ""} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm">To Date</label>
                            <Input type="date" value={endDate ?? ""} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button type="submit">Search</Button>
                        </div>
                    </form>

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

            {/* Pay Imprest Modal */}
            <Dialog open={payImprestOpen} onOpenChange={setPayImprestOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pay Imprest</DialogTitle>
                    </DialogHeader>
                    <form
                        className="grid gap-3"
                        onSubmit={e => {
                            e.preventDefault();
                            setPayImprestOpen(false);
                        }}
                    >
                        <div>
                            <label className="text-sm">Date</label>
                            <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                        </div>
                        <div>
                            <label className="text-sm">Amount</label>
                            <Input type="text" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setPayImprestOpen(false)}>
                                Close
                            </Button>
                            <Button type="submit">Submit</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Remark Modal */}
            <Dialog open={remarkOpen} onOpenChange={setRemarkOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Remarks</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitRemark} className="grid gap-3">
                        <div>
                            <label className="text-sm">Remarks</label>
                            <Textarea value={remarkText} onChange={e => setRemarkText(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setRemarkOpen(false)}>
                                Close
                            </Button>
                            <Button type="submit">Submit</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Lightbox */}
            {lightboxOpen && <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={lightboxSlides} />}
        </div>
    );
};

export default ImprestDetailsPage;
