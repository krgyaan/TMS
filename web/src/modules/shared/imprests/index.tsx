import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/ui/data-table"; // your AG Grid wrapper
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Eye, Trash, CheckSquare, FileText, Plus } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import Lightbox from "yet-another-react-lightbox"; // you asked for this lightbox
import "yet-another-react-lightbox/styles.css";

// -----------------------------
// Dummy Data
// -----------------------------
type ProofFile = { url: string; name: string; type: string };

type ImprestRow = {
    id: number;
    strtotime: number; // unix timestamp seconds
    user: { name: string };
    party_name: string;
    project_name: string;
    amount: number;
    category: { category: string };
    category_id: number;
    team?: { name: string };
    invoice_proof?: ProofFile[] | null; // array or null
    remark?: string;
    acc_remark?: string;
    buttonstatus?: number; // approved
    tallystatus?: number;
    proofstatus?: number;
};

const dummyRows: ImprestRow[] = [
    {
        id: 1,
        strtotime: Math.floor(new Date("2025-01-10").getTime() / 1000),
        user: { name: "Amit Sharma" },
        party_name: "Skyline Traders",
        project_name: "Project A",
        amount: 15000,
        category: { category: "Travel" },
        category_id: 10,
        invoice_proof: [
            {
                url: "https://revealthat.com/wp-content/uploads/2024/10/swiggy-order-delivered.webp",
                name: "IMG-1.webp",
                type: "image",
            },
            { url: "https://example.com/dummy.pdf", name: "doc.pdf", type: "pdf" },
        ],
        remark: "Taxi fare",
        acc_remark: "",
        buttonstatus: 0,
        tallystatus: 0,
        proofstatus: 0,
    },
    {
        id: 2,
        strtotime: Math.floor(new Date("2025-01-05").getTime() / 1000),
        user: { name: "Rakesh Gupta" },
        party_name: "Bright Solar",
        project_name: "Installation X",
        amount: 32000,
        category: { category: "Material" },
        category_id: 22,
        team: { name: "Site Team" },
        invoice_proof: null,
        remark: "Panels purchase",
        acc_remark: "Checked",
        buttonstatus: 1,
        tallystatus: 0,
        proofstatus: 0,
    },
];

// -----------------------------
// Helper: format INR
// -----------------------------
const formatINR = (num: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
};

const ImprestDetailsPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // path: /shared/imprests/imprest-details/:id

    // table rows state
    const [rows, setRows] = useState<ImprestRow[]>(dummyRows);

    // summary calculations (derived from rows)
    const amtReceived = useMemo(() => rows.reduce((s, r) => s + (r.amount ?? 0), 0) + 50000, [rows]); // dummy tweak
    const amtSpent = useMemo(() => rows.reduce((s, r) => s + (r.amount ?? 0), 0), [rows]);
    const amtApproved = useMemo(() => rows.filter(r => r.buttonstatus === 1).reduce((s, r) => s + (r.amount ?? 0), 0), [rows]);
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

    // file inputs for add proof
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

    // Date filter values
    const [startDate, setStartDate] = useState<string | undefined>(undefined);
    const [endDate, setEndDate] = useState<string | undefined>(undefined);

    // -----------------------------
    // Action handlers (simulate API with dummy updates)
    // -----------------------------
    const toggleButtonStatus = useCallback((rowId: number) => {
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, buttonstatus: r.buttonstatus === 1 ? 0 : 1 } : r)));
    }, []);

    const toggleTallyStatus = useCallback((rowId: number) => {
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, tallystatus: r.tallystatus === 1 ? 0 : 1 } : r)));
    }, []);

    const toggleProofStatus = useCallback((rowId: number) => {
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, proofstatus: r.proofstatus === 1 ? 0 : 1 } : r)));
    }, []);

    const openAddProof = (rowId: number) => {
        setCurrentProofRowId(rowId);
        setAddProofOpen(true);
    };

    const submitAddProof = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentProofRowId) return;

        // Fake upload: convert selected File[] to ProofFile[] with objectUrl (not persisted)
        const newProofs = filesToUpload.map(f => ({
            url: URL.createObjectURL(f),
            name: f.name,
            type: f.type.startsWith("image") ? "image" : "file",
        }));

        setRows(prev => prev.map(r => (r.id === currentProofRowId ? { ...r, invoice_proof: [...(r.invoice_proof ?? []), ...newProofs] } : r)));

        setFilesToUpload([]);
        setAddProofOpen(false);
    };

    const openRemarkModal = (rowId: number) => {
        const row = rows.find(r => r.id === rowId);
        setRemarkText(row?.acc_remark ?? "");
        setCurrentProofRowId(rowId);
        setRemarkOpen(true);
    };

    const submitRemark = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentProofRowId) return;
        setRows(prev => prev.map(r => (r.id === currentProofRowId ? { ...r, acc_remark: remarkText } : r)));
        setRemarkOpen(false);
    };

    const openLightboxForRow = (row: ImprestRow) => {
        const slides = (row.invoice_proof ?? []).filter(p => p.type === "image").map(p => ({ src: p.url }));
        if (slides.length === 0) return; // nothing to show
        setLightboxSlides(slides);
        setLightboxOpen(true);
    };

    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files ? Array.from(e.target.files) : [];
        setFilesToUpload(f);
    };

    // -----------------------------
    // Columns for AG Grid
    // -----------------------------
    const actionItems = useMemo(
        () => [
            {
                label: "Approve",
                icon: <CheckSquare className="h-4 w-4" />,
                onClick: (row: ImprestRow) => toggleButtonStatus(row.id),
            },
            {
                label: "Tally",
                icon: <FileText className="h-4 w-4" />,
                onClick: (row: ImprestRow) => toggleTallyStatus(row.id),
            },
            {
                label: "Proof",
                icon: <Plus className="h-4 w-4" />,
                onClick: (row: ImprestRow) => openAddProof(row.id),
            },
            {
                label: "Remarks",
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: ImprestRow) => openRemarkModal(row.id),
            },
            {
                label: "Delete",
                icon: <Trash className="h-4 w-4" />,
                className: "text-red-600",
                onClick: (row: ImprestRow) => {
                    if (confirm("Are you sure you want to delete this record?")) {
                        setRows(prev => prev.filter(p => p.id !== row.id));
                    }
                },
            },
        ],
        [toggleButtonStatus, toggleTallyStatus]
    );

    const columns: ColDef[] = useMemo(
        () => [
            {
                field: "strtotime",
                headerName: "Date",
                width: 120,
                valueGetter: (p: any) => {
                    const unix = p.data?.strtotime ?? 0;
                    const d = new Date(unix * 1000);
                    return d.toLocaleDateString("en-GB");
                },
            },
            { field: "user.name", headerName: "Name", width: 150, valueGetter: (p: any) => p.data?.user?.name ?? "-" },
            { field: "party_name", headerName: "Party Name", width: 160 },
            { field: "project_name", headerName: "Project Name", width: 160 },
            { field: "amount", headerName: "Amount", width: 120, valueFormatter: (p: any) => formatINR(p.value) },
            {
                field: "category",
                headerName: "Category",
                width: 160,
                cellRenderer: (p: any) => {
                    const row: ImprestRow = p.data;
                    return (
                        <div>
                            <div>{row.category?.category}</div>
                            {row.category_id === 22 && row.team ? <div className="text-xs text-muted">{row.team.name}</div> : null}
                        </div>
                    );
                },
            },
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
                field: "acc_remark",
                headerName: "Account Team Remarks",
                width: 200,
                cellRenderer: (p: any) => <div id={`remark-text-${p.data.id}`}>{p.data.acc_remark ?? ""}</div>,
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

    // Filter submit (dummy) — just filters locally for demo
    const handleFilterSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        // For demo: do nothing (or simulate an in-place filter)
        console.log("Filter by", startDate, endDate);
    };

    return (
        <div>
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <div>
                        <CardTitle>Imprest Details</CardTitle>
                        <CardDescription>Details for employee ID: {id}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate("/shared/imprests")}>
                            Back
                        </Button>
                        <Button onClick={() => setPayImprestOpen(true)}>Pay Imprest</Button>
                        <Button onClick={() => setPayImprestOpen(true)}> Imprest</Button>
                        <Button onClick={() => console.log("Download Excel (placeholder)")}>Imprest Voucher</Button>
                        <Button variant="ghost" onClick={() => console.log("Download Excel placeholder")}>
                            Download Excel
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
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

                    <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <input type="hidden" name="name_id" value={id ?? ""} />
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

                    <div className="card">
                        <div className="card-body">
                            <div className="table-responsive mt-3">
                                <DataTable data={rows} loading={false} columnDefs={columns} gridOptions={{ pagination: true }} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add Proof Modal */}
            <Dialog open={addProofOpen} onOpenChange={setAddProofOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Proof</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submitAddProof} className="grid gap-4">
                        <input type="hidden" name="id" value={currentProofRowId ?? ""} />

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
                            <label className="text-sm">Team Member Name</label>
                            <Input value={`Employee ${id ?? ""}`} readOnly />
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
