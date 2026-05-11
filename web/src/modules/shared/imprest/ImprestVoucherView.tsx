import React from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useImprestVoucherView, useAccountApproveVoucher, useAdminApproveVoucher } from "./imprest.hooks";
import type { InvoiceProof } from "./imprest.types";



import { useAuth } from "@/contexts/AuthContext";
import html2pdf from "html2pdf.js";

/* ---------------------------------- */
/* Utilities                          */
/* ---------------------------------- */

const formatDate = (d?: string | null) =>
    d
        ? new Date(d).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "";

const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);

/* ---------------------------------- */
/* Component                          */
/* ---------------------------------- */

const ImprestVoucherView: React.FC = () => {
    const [searchParams] = useSearchParams();

    const userId = Number(searchParams.get("userId"));
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const year = Number(searchParams.get("year"));
    const week = Number(searchParams.get("week"));

    const location = useLocation();
    const stateProofs = location.state?.proofs as InvoiceProof[] | undefined;

    if (!userId || !from || !to) {
        return <div className="p-6">Invalid voucher link</div>;
    }

    const isSigned = (v?: string | null) => v && v.trim().length > 0;

    const navigate = useNavigate();
    const { canRead, canUpdate, user } = useAuth();

    const canMutateStatus = canUpdate("accounts.imprests");

    const isAuthorized = canRead("shared.imprests");

    if (!canRead("shared.imprests")) {
        return <div className="p-6">Access denied</div>;
    }

    const { data, isLoading, refetch } = useImprestVoucherView({
        userId,
        from,
        to,
    });

    const accountApproveMutation = useAccountApproveVoucher();
    const adminApproveMutation = useAdminApproveVoucher();

    const [accModalOpen, setAccModalOpen] = React.useState(false);
    const [adminModalOpen, setAdminModalOpen] = React.useState(false);

    const [remark, setRemark] = React.useState("");
    const [accApprove, setAccApprove] = React.useState(false);
    const [adminApprove, setAdminApprove] = React.useState(false);

    const [preview, setPreview] = React.useState<InvoiceProof | null>(null);

    if (isLoading) return <div className="p-6">Loading…</div>;
    if (!data) return <div className="p-6">Voucher not found</div>;

    const { voucher, items } = data;
    
    // Merge proofs from state or voucher
    let proofs: InvoiceProof[] = [];
    if (stateProofs && stateProofs.length > 0) {
        proofs = stateProofs;
    } else if (voucher.proofs && voucher.proofs.length > 0) {
        proofs = voucher.proofs;
    }

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    const resetForm = () => {
        setRemark("");
        setAccApprove(false);
        setAdminApprove(false);
    };

    /* ---------------------------------- */
    /* Handlers                           */
    /* ---------------------------------- */

    const handleAccountSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        accountApproveMutation.mutate(
            {
                id: voucher.id,
                remark,
                approve: accApprove,
            },
            {
                onSuccess: () => {
                    setAccModalOpen(false);
                    resetForm();
                    refetch();
                },
            }
        );
    };

    const handleAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        adminApproveMutation.mutate(
            {
                id: voucher.id,
                remark,
                approve: adminApprove,
            },
            {
                onSuccess: () => {
                    setAdminModalOpen(false);
                    resetForm();
                    refetch();
                },
            }
        );
    };

    const injectHtml2CanvasSafeCSS = () => {
        const style = document.createElement("style");
        style.id = "html2canvas-safe-style";
        style.innerHTML = `
        html.pdf-export, html.pdf-export * {
            color: #000 !important;
            background-color: #fff !important;
            border-color: #000 !important;

            --background: #ffffff !important;
            --foreground: #000000 !important;
            --card: #ffffff !important;
            --card-foreground: #000000 !important;
            --popover: #ffffff !important;
            --popover-foreground: #000000 !important;
            --primary: #000000 !important;
            --primary-foreground: #ffffff !important;
            --secondary: #ffffff !important;
            --secondary-foreground: #000000 !important;
            --muted: #ffffff !important;
            --muted-foreground: #000000 !important;
            --accent: #ffffff !important;
            --accent-foreground: #000000 !important;
            --border: #000000 !important;
            --input: #ffffff !important;
            --ring: #000000 !important;
        }
    `;
        document.head.appendChild(style);
    };

    const removeHtml2CanvasSafeCSS = () => {
        document.getElementById("html2canvas-safe-style")?.remove();
    };

    const handleExportPDF = async () => {
        const element = document.getElementById("printableArea");
        if (!element) return;

        // 🔑 Enable PDF mode
        document.documentElement.classList.add("pdf-export");
        injectHtml2CanvasSafeCSS();

        try {
            await html2pdf()
                .set({
                    margin: [5, 5, 5, 5] as const,
                    filename: `Imprest-Voucher-${voucher.voucherCode}.pdf`,
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: "#ffffff",
                    },
                    jsPDF: {
                        unit: "mm",
                        format: "a4",
                        orientation: "portrait",
                    },
                })
                .from(element)
                .save();
        } finally {
            // 🔑 Always clean up
            document.documentElement.classList.remove("pdf-export");
            removeHtml2CanvasSafeCSS();
        }
    };

    /* ---------------------------------- */
    /* Render                             */
    /* ---------------------------------- */

    return (
        <div className="voucher-page">
            {/* ---------------- Back ---------------- */}
            <div className="voucher-toolbar">
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>
            </div>

            {/* ================= PRINTABLE AREA ================= */}
            <div id="printableArea" className="voucher-container">
                {/* ---------------- Company Header ---------------- */}
                <table className="voucher-header">
                    <tbody>
                        <tr>
                            <td colSpan={4}>
                                <h4>Volks Energie Pvt Ltd</h4>
                                <p>Solar and Air Conditioning Contractor</p>
                                <p>New Delhi - 110044</p>
                                <p>Ph: +91-8882591733 | E-mail: accounts@volksenergie.in</p>
                            </td>
                        </tr>

                        <tr>
                            <td colSpan={4} className="text-xl pt-3">
                                <h3>Expense Report</h3>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                FROM <b>{formatDate(voucher.validFrom)}</b> TO <b>{formatDate(voucher.validTo)}</b>
                            </td>
                            <td colSpan={3} className="text-right">
                                <b>Voucher No: {voucher.voucherCode}</b>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                Employee Name:
                                <br />
                                <b>{voucher.beneficiaryName}</b>
                            </td>
                            <td>
                                Employee ID:
                                <br />
                                <b>ID00{voucher.beneficiaryId}</b>
                            </td>
                            <td colSpan={2}>
                                Team Name:
                                <br />
                                <b>{voucher.teamName}</b>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ---------------- Items Table ---------------- */}
                <table className="voucher-items">
                    <thead>
                        <tr>
                            <th>Sr.No.</th>
                            <th>Category</th>
                            <th>Project Code</th>
                            <th>Project Name</th>
                            <th>Remarks</th>
                            <th className="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center">
                                    No records found.
                                </td>
                            </tr>
                        )}

                        {items.map((i, idx) => (
                            <tr key={i.id}>
                                <td>{idx + 1}</td>
                                <td className="wrap">{i.category}</td>
                                <td>{i.projectCode}</td>
                                <td className="wrap">{i.projectName}</td>
                                <td className="wrap">{i.remark}</td>
                                <td className="text-right">{formatINR(i.amount)}</td>
                            </tr>
                        ))}

                        <tr className="total-row">
                            <td colSpan={5} className="text-right">
                                Total
                            </td>
                            <td className="text-right">{formatINR(totalAmount)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ---------------- Signatures ---------------- */}
                <table className="voucher-signatures">
                    <tbody>
                        <tr>
                            <th>Prepared By:</th>
                            <td>{voucher.employeeName}</td>
                            <th>Date:</th>
                            <td></td>
                        </tr>

                        <tr>
                            <th>Checked By:</th>
                            <td>{voucher.accountsSignedBy ? <img src={`/uploads/signs/${voucher.accountsSignedBy}`} alt="Accounts Sign" /> : <i>to be signed</i>}</td>
                            <th>Date:</th>
                            <td>{formatDate(voucher.accountsSignedAt)}</td>
                        </tr>

                        <tr>
                            <th>Approved By:</th>
                            <td>{voucher.adminSignedBy ? <img src={`/uploads/signs/${voucher.adminSignedBy}`} alt="Admin Sign" /> : <i>to be signed</i>}</td>
                            <th>Date:</th>
                            <td>{formatDate(voucher.adminSignedAt)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ---------------- Actions ---------------- */}
            <div className="voucher-actions">
                {canMutateStatus &&  (
                    <Button variant="outline" onClick={() => setAccModalOpen(true)}>
                        Approve by Accounts
                    </Button>
                )}

                {canMutateStatus &&  (
                    <Button variant="outline" onClick={() => setAdminModalOpen(true)}>
                        Approve by CEO
                    </Button>
                )}

                <Button onClick={handleExportPDF}>Print</Button>
            </div>

            {/* ---------------- Proofs ---------------- */}
            {proofs.length > 0 && (
                <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-background shadow-sm voucher-proofs">
                    <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">Voucher Proofs</h3>
                            <p className="text-sm text-muted-foreground">
                                Preview uploaded images and PDF documents.
                            </p>
                        </div>

                        <div className="inline-flex w-fit items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                            {`${proofs.length} file${proofs.length === 1 ? "" : "s"}`}
                        </div>
                    </div>

                    <div className="grid min-h-[560px] lg:grid-cols-[280px_minmax(0,1fr)]">
                        {/* Sidebar */}
                        <div className="border-b border-border bg-muted/20 p-4 lg:border-b-0 lg:border-r">
                            {proofs.length > 0 ? (
                                <div className="space-y-2">
                                    {proofs.map((proof, index) => {
                                        const active = preview?.id === proof.id;

                                        return (
                                            <button
                                                key={proof.id}
                                                type="button"
                                                onClick={() => setPreview(proof)}
                                                className={`w-full rounded-xl border p-3 text-left transition-all ${
                                                    active
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
                                                }`}
                                            >
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <span className="text-sm font-medium text-foreground">
                                                        Proof {index + 1}
                                                    </span>
                                                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                        {proof.type}
                                                    </span>
                                                </div>

                                                <p className="truncate text-xs text-muted-foreground">
                                                    {proof.type === "pdf" ? "PDF document" : "Image attachment"}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 text-center text-sm text-muted-foreground">
                                    No proofs found for this voucher.
                                </div>
                            )}
                        </div>

                        {/* Viewer */}
                        <div className="flex min-w-0 flex-col bg-background">
                            {preview ? (
                                <>
                                    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="mb-1 flex items-center gap-2">
                                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    {preview.type}
                                                </span>
                                                <span className="text-sm font-medium text-foreground">
                                                    {preview.type === "pdf" ? "PDF Preview" : "Image Preview"}
                                                </span>
                                            </div>
                                            <p className="truncate text-sm text-muted-foreground">
                                                Use open/download if preview is limited in your browser.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button asChild variant="outline" size="sm">
                                                <a href={preview.url} target="_blank" rel="noreferrer">
                                                    Open
                                                </a>
                                            </Button>

                                            <Button asChild size="sm">
                                                <a href={preview.url} download>
                                                    Download
                                                </a>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="h-[72vh] min-h-[520px] p-4">
                                        {preview.type === "pdf" ? (
                                            <div className="h-full overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-sm">
                                                <iframe
                                                    src={`${preview.url}#toolbar=0&navpanes=0&scrollbar=1`}
                                                    title="PDF Preview"
                                                    className="h-full w-full bg-white"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-full items-center justify-center rounded-2xl border border-border bg-muted/20 p-4 shadow-sm">
                                                <img
                                                    src={preview.url}
                                                    alt="Voucher Proof"
                                                    className="max-h-full max-w-full rounded-xl object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-6 text-center">
                                    <div className="mb-3 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                                        No file selected
                                    </div>
                                    <h4 className="text-sm font-medium text-foreground">Choose a proof to preview</h4>
                                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                        Select any file from the left panel to view it here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ================= MODALS ================= */}

            {/* Accounts Modal */}
            <Dialog open={accModalOpen} onOpenChange={setAccModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve by Accounts</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAccountSubmit} className="space-y-4">
                        <Textarea placeholder="Remark" value={remark} onChange={e => setRemark(e.target.value)} />

                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={accApprove} onChange={e => setAccApprove(e.target.checked)} />
                            Approve it
                        </label>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setAccModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={accountApproveMutation.isLoading}>
                                Submit
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Admin Modal */}
            <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve by CEO</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAdminSubmit} className="space-y-4">
                        <Textarea placeholder="Remark" value={remark} onChange={e => setRemark(e.target.value)} />

                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={adminApprove} onChange={e => setAdminApprove(e.target.checked)} />
                            Approve it
                        </label>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setAdminModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={adminApproveMutation.isLoading}>
                                Submit
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            <style>{`
                .voucher-container {
                    padding: 20px;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 12px;
                    color: inherit;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                /* ================= Header ================= */

                .voucher-header,
                .voucher-header td {
                    border: 1px solid currentColor;
                }

                .voucher-header h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: bold;
                }

                .voucher-header p {
                    margin: 2px 0;
                    font-size: 12px;
                }

                .voucher-header td {
                    padding: 6px;
                    vertical-align: top;
                }

                /* ================= Items Table ================= */

                .voucher-items {
                    margin-top: 18px;
                    table-layout: fixed;        /* CRITICAL */
                    font-size: 11px;
                }

                .voucher-items th,
                .voucher-items td {
                    border: 1px solid currentColor;
                    padding: 6px;
                    vertical-align: top;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                }

                .voucher-items th {
                    font-weight: bold;
                    text-align: left;
                }

                /* Column widths (match accounting PDF) */
                .voucher-items th:nth-child(1),
                .voucher-items td:nth-child(1) { width: 5%; }

                .voucher-items th:nth-child(2),
                .voucher-items td:nth-child(2) { width: 16%; }

                .voucher-items th:nth-child(3),
                .voucher-items td:nth-child(3) { width: 12%; }

                .voucher-items th:nth-child(4),
                .voucher-items td:nth-child(4) { width: 16%; }

                .voucher-items th:nth-child(5),
                .voucher-items td:nth-child(5) { width: 33%; }

                .voucher-items th:nth-child(6),
                .voucher-items td:nth-child(6) {
                    width: 18%;
                    text-align: right;
                }

                /* Repeat table header on every PDF page */
                thead {
                    display: table-header-group;
                }

                tr {
                    page-break-inside: avoid;
                }

                /* ================= Total Row ================= */

                .total-row td {
                    font-weight: bold;
                    border-top: 2px solid #000;
                }

                /* ================= Signatures ================= */

                .voucher-signatures {
                    margin-top: 32px;
                    width: 60%;
                }

                .voucher-signatures,
                .voucher-signatures th,
                .voucher-signatures td {
                    border: 1px solid currentColor;
                }

                .voucher-signatures th,
                .voucher-signatures td {
                    padding: 8px;
                    font-size: 12px;
                }

                .voucher-signatures img {
                    height: 40px;
                    width: 120px;
                    object-fit: contain;
                }

                /* ================= Utility ================= */

                .text-right {
                    text-align: right;
                }

                .voucher-actions {
                    display: flex;
                    justify-content: center;
                    margin-top: 24px;
                }

                html.pdf-export {

                    /* ---------- Page geometry ---------- */
                    @page {
                        size: A4 portrait;
                        margin: 8mm;
                    }
                }

                /* ---------- Lock printable width (prevents squeezing) ---------- */
                html.pdf-export .voucher-container {
                    width: 194mm;          /* usable A4 width */
                    margin: 0 auto;
                    padding: 0;
                    font-size: 11px;
                }

                /* ---------- Table behaves like costing sheet ---------- */
                html.pdf-export .voucher-items {
                    table-layout: auto;    /* 🔑 override fixed layout */
                    font-size: 11px;
                }

                /* ---------- Header repeat ---------- */
                html.pdf-export .voucher-items thead {
                    display: table-header-group;
                }

                /* ---------- Cell behaviour ---------- */
                html.pdf-export .voucher-items th,
                html.pdf-export .voucher-items td {
                    white-space: normal;
                    word-break: break-word;
                    line-height: 1.35;
                    vertical-align: top;
                }

                /* ---------- Column minimums (NOT widths) ---------- */
                html.pdf-export .voucher-items th:nth-child(1),
                html.pdf-export .voucher-items td:nth-child(1) {
                    min-width: 10mm;
                }

                html.pdf-export .voucher-items th:nth-child(2),
                html.pdf-export .voucher-items td:nth-child(2) {
                    min-width: 28mm;
                }

                html.pdf-export .voucher-items th:nth-child(3),
                html.pdf-export .voucher-items td:nth-child(3) {
                    font-size: 8.5px;        /* smaller font */
                    letter-spacing: 0.2px;
                    white-space: nowrap;     /* 🔑 prevents line break */
                    word-break: keep-all;    /* 🔑 do not break text */
                }
               html.pdf-export .voucher-items th:nth-child(4),
                html.pdf-export .voucher-items td:nth-child(4) {
                    font-size: 9px;        /* smaller, accounting-style */
                    letter-spacing: 0.2px;
                    min-width: 28mm;
                }

                html.pdf-export .voucher-items th:nth-child(5),
                html.pdf-export .voucher-items td:nth-child(5) {
                    min-width: 70mm;       /* remarks */
                    min-width: 28mm;
                }

                html.pdf-export .voucher-items th:nth-child(6),
                html.pdf-export .voucher-items td:nth-child(6) {
                    width: 10mm;
                    text-align: right;
                }

                /* ---------- Page break discipline ---------- */
                html.pdf-export .voucher-items tr {
                    page-break-inside: avoid;
                }

                html.pdf-export .total-row {
                    page-break-inside: avoid;
                }

                html.pdf-export .voucher-signatures {
                    page-break-inside: avoid;
                    margin-top: 24px;
                }

                /* ---------- Signature images ---------- */
                html.pdf-export .voucher-signatures img {
                    max-width: 100%;
                    height: 40px;
                    object-fit: contain;
                }

                /* ---------- Hide UI-only elements in PDF ---------- */
                html.pdf-export .voucher-actions,
                html.pdf-export .voucher-toolbar,
                html.pdf-export .voucher-proofs {
                    display: none !important;
                }

                .voucher-items td:nth-child(3) {
                    white-space: nowrap;
                    word-break: keep-all;
                    font-size: 10px;
                }
                
                .voucher-proofs {
                    max-width: 1000px;
                    margin: 24px auto;
                }
            `}</style>
        </div>
    );
};

export default ImprestVoucherView;
