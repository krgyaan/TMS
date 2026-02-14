import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useImprestVoucherView, useAccountApproveVoucher, useAdminApproveVoucher } from "./imprest.hooks";

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
    const { id } = useParams<{ id: string }>();
    const voucherId = Number(id);

    const navigate = useNavigate();
    const { canRead, canUpdate, user } = useAuth();

    const canMutateStatus = canUpdate("shared.imprests");

    const isAuthorized = canRead("shared.imprests");

    const { data, isLoading, refetch } = useImprestVoucherView(voucherId);

    const accountApproveMutation = useAccountApproveVoucher();
    const adminApproveMutation = useAdminApproveVoucher();

    const [accModalOpen, setAccModalOpen] = React.useState(false);
    const [adminModalOpen, setAdminModalOpen] = React.useState(false);

    const [remark, setRemark] = React.useState("");
    const [approve, setApprove] = React.useState(false);

    if (isLoading) return <div className="p-6">Loading…</div>;
    if (!data) return <div className="p-6">Voucher not found</div>;
    if (!canRead("accounts.imprests")) return <div className="p-6">Access denied</div>;

    const { voucher, items } = data;

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    const resetForm = () => {
        setRemark("");
        setApprove(false);
    };

    /* ---------------------------------- */
    /* Handlers                           */
    /* ---------------------------------- */

    const handleAccountSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        accountApproveMutation.mutate(
            { id: voucher.id, remark, approve },
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
            { id: voucher.id, remark, approve },
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
                    margin: [10, 10, 10, 10] as const,
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
                        orientation: "landscape",
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
                                <b>{voucher.employeeName}</b>
                            </td>
                            <td>
                                Employee ID:
                                <br />
                                <b>ID00{voucher.employeeId}</b>
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
                {canMutateStatus && !voucher.accountsSignedBy && (
                    <Button variant="outline" onClick={() => setAccModalOpen(true)}>
                        Approve by Accounts
                    </Button>
                )}

                {canMutateStatus && !voucher.adminSignedBy && (
                    <Button variant="outline" onClick={() => setAdminModalOpen(true)}>
                        Approve by CEO
                    </Button>
                )}

                <Button onClick={handleExportPDF}>Print</Button>
            </div>
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
                            <input type="checkbox" checked={approve} onChange={e => setApprove(e.target.checked)} />
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
                            <input type="checkbox" checked={approve} onChange={e => setApprove(e.target.checked)} />
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
            `}</style>
        </div>
    );
};

export default ImprestVoucherView;
