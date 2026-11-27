import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountApproveVoucher, useAdminApproveVoucher, useImprestVoucherView } from "@/hooks/api/imprest.hooks";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import html2pdf from "html2pdf.js";
import { AlertCircle, ArrowLeft, CheckCircle, FileQuestion, Loader2, MessageSquare, Printer, ShieldAlert, Lock } from "lucide-react";
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const ImprestVoucherView: React.FC = () => {
    const [searchParams] = useSearchParams();

    const userId = Number(searchParams.get("userId"));
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const navigate = useNavigate();
    const { canRead, canUpdate } = useAuth();

    const canMutateStatus = canUpdate("accounts.imprests");

    const accountApproveMutation = useAccountApproveVoucher();
    const adminApproveMutation = useAdminApproveVoucher();

    const [accModalOpen, setAccModalOpen] = React.useState(false);
    const [adminModalOpen, setAdminModalOpen] = React.useState(false);

    const [remark, setRemark] = React.useState("");
    const [accApprove, setAccApprove] = React.useState(false);
    const [adminApprove, setAdminApprove] = React.useState(false);

    const { data, isLoading, refetch, error: queryError } = useImprestVoucherView({ userId, from: from ?? '', to: to ?? '' });

    const voucher = data?.voucher;
    const items = data?.items || [];

    // 409 amount mismatch (signed voucher) — show a dedicated error instead of the generic boundary.
    if (queryError) {
        const ax = queryError as { response?: { status?: number; data?: { message?: string | string[] } } };
        const errStatus = ax?.response?.status;
        const rawMsg = ax?.response?.data?.message;
        const errText = Array.isArray(rawMsg) ? rawMsg.filter(Boolean).join(", ") : rawMsg ?? "";
        if (errStatus === 409) {
            return (
                <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                    <div className="bg-destructive/10 p-4 rounded-full mb-4">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">Voucher Amount Mismatch</h2>
                    <p className="text-muted-foreground mt-2 max-w-md text-sm">{errText || "The stored voucher total does not match its linked imprests, and the week is signed — cannot auto-correct."}</p>
                    <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                    </Button>
                </div>
            );
        }
    }

    if (!canRead("shared.imprests")) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-destructive/10 p-4 rounded-full mb-4">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Access Denied</h2>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    You do not have the required permissions to view imprest vouchers. Please contact your administrator.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }
    
    if (!userId || !from || !to) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-orange-500/10 p-4 rounded-full mb-4">
                    <AlertCircle className="h-10 w-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Invalid Link</h2>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    The voucher link is incomplete or malformed. Please verify the URL and try again.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-medium text-muted-foreground animate-pulse">Loading Voucher...</h2>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <FileQuestion className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Voucher Not Found</h2>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    We couldn't find the voucher you're looking for. It may have been deleted or the dates might be incorrect.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }


    if (!voucher) {
        return (
            <div className="flex h-[80vh]flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <FileQuestion className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Voucher Not Found</h2>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    We couldn't load the voucher details. It may have been removed or the link is incomplete.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }


    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    const resetForm = () => {
        setRemark("");
        setAccApprove(false);
        setAdminApprove(false);
    };

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
            document.documentElement.classList.remove("pdf-export");
            removeHtml2CanvasSafeCSS();
        }
    };

    return (
        <div className="voucher-page">
            {/* ---------------- Back ---------------- */}
            <div className="voucher-toolbar">
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>
            </div>

            {/* -------- Week-locked banner -------- */}
            {voucher.accountsSignedBy && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-xl px-4 py-3 mb-4 print:hidden">
                    <Lock className="h-4 w-4 shrink-0" />
                    <p className="text-sm">
                        This expense week is locked — accounts has approved this voucher on{" "}
                        <b>{formatDate(voucher.accountsSignedAt)}</b>.
                        No new entries may be created or modified in this week.
                    </p>
                </div>
            )}

            {/* -------- Amount-mismatch warning (unsigned, auto-corrected) -------- */}
            {voucher && items.length > 0 && Math.abs(items.reduce((s, i) => s + i.amount, 0) - Number(voucher.amount)) > 0.01 && !voucher.accountsSignedBy && (
                <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 rounded-xl px-4 py-3 mb-4 print:hidden">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-sm">
                        This voucher's total was auto-corrected from{" "}
                        <b>{formatINR(Number(voucher.amount))}</b> to{" "}
                        <b>{formatINR(items.reduce((s, i) => s + i.amount, 0))}</b> to
                        match its linked imprests.
                    </p>
                </div>
            )}

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
                            <th style={{ width: '10mm' }}>Sr.No.</th>
                            <th style={{ width: '22mm' }}>Date of Expense</th>
                            <th style={{ width: '20mm' }}>Category</th>
                            <th style={{ width: '60mm' }}>Project</th>
                            <th style={{ width: '60mm' }}>Remarks</th>
                            <th style={{ width: '16mm' }} className="text-right">Amount</th>
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
                                <td style={{ width: '10mm' }}>{idx + 1}</td>
                                <td style={{ width: '22mm' }}>{formatDate(i.dateOfExpense)}</td>
                                <td style={{ width: '20mm' }} className="wrap">{i.category}</td>
                                <td style={{ width: '60mm' }} className="wrap">
                                    <span className="block">{i.projectName || "-"}</span>
                                    <span className="block">{i.projectCode || "-"}</span>
                                </td>
                                <td style={{ width: '60mm' }} className="white-space: nowrap, word-break: keep-all">{i.remark}</td>
                                <td style={{ width: '16mm' }} className="text-right">{formatINR(i.amount)}</td>
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
                            <td>{voucher.beneficiaryName}</td>
                            <th>Date:</th>
                            <td></td>
                        </tr>

                        <tr>
                            <th>Checked By:</th>
                            <td>{voucher.accountsSignedBy ? "—" : <i>to be signed</i>}</td>
                            <th>Date:</th>
                            <td>{formatDate(voucher.accountsSignedAt)}</td>
                        </tr>

                        <tr>
                            <th>Approved By:</th>
                            <td>{voucher.adminSignedBy ? "—" : <i>to be signed</i>}</td>
                            <th>Date:</th>
                            <td>{formatDate(voucher.adminSignedAt)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ---------------- Remarks & Actions ---------------- */}
            <div className="mt-8 flex flex-col gap-6 border-t pt-6 print:hidden">
                {/* Remarks Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex gap-3 items-start transition-colors hover:bg-muted/50">
                        <div className="p-2 bg-muted text-muted-foreground rounded-lg shrink-0">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 mt-0.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Accounts Comment</p>
                            {voucher.accountsRemark ? (
                                <p className="text-sm font-medium text-foreground">{voucher.accountsRemark}</p>
                            ) : (
                                <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border italic">
                                    No comment added
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex gap-3 items-start transition-colors hover:bg-muted/50">
                        <div className="p-2 bg-muted text-muted-foreground rounded-lg shrink-0">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 mt-0.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">CEO Comment</p>
                            {voucher.adminRemark ? (
                                <p className="text-sm font-medium text-foreground">{voucher.adminRemark}</p>
                            ) : (
                                <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border italic">
                                    No comment added
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {canMutateStatus && (
                        <Button 
                            variant="default" 
                            onClick={() => setAccModalOpen(true)}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve by Accounts
                        </Button>
                    )}

                    {canMutateStatus && (
                        <Button 
                            variant="default" 
                            onClick={() => setAdminModalOpen(true)}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve by CEO
                        </Button>
                    )}

                    <Button 
                        variant="outline" 
                        onClick={handleExportPDF}
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Voucher
                    </Button>
                </div>
            </div>

            {/* ================= MODALS ================= */}

            {/* Accounts Modal */}
            <Dialog open={accModalOpen} onOpenChange={setAccModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Accounts Approval</DialogTitle>
                        <DialogDescription>
                            Add an optional remark and confirm your approval for this imprest voucher.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAccountSubmit} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Remark (Optional)</label>
                            <Textarea 
                                placeholder="Add any comments or notes here..." 
                                value={remark} 
                                onChange={e => setRemark(e.target.value)} 
                                className="resize-none h-24 p-2"
                            />
                        </div>

                        {!voucher.accountsSignedBy ? (
                            <div className="flex items-start gap-3 p-4 bg-muted/40 border rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="acc-approve"
                                    checked={accApprove} 
                                    onChange={e => setAccApprove(e.target.checked)} 
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="space-y-1">
                                    <label htmlFor="acc-approve" className="text-sm font-medium leading-none cursor-pointer">
                                        Approve Voucher
                                    </label> 
                                {/* <p className="text-sm text-muted-foreground">
                                    By checking this, you officially mark the voucher as Accounts Approved.
                                </p> */}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Already Approved by Accounts</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setAccModalOpen(false)} className="w-24">
                                Cancel
                            </Button>
                            <Button type="submit" className="w-32">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Submit
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Admin Modal */}
            <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">CEO Approval</DialogTitle>
                        <DialogDescription>
                            Add an optional remark and confirm your approval for this imprest voucher.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAdminSubmit} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Remark (Optional)</label>
                            <Textarea 
                                placeholder="Add any comments or notes here..." 
                                value={remark} 
                                onChange={e => setRemark(e.target.value)} 
                                className="resize-none h-24 p-2"
                            />
                        </div>

                        {!voucher.adminSignedBy ? (
                            <div className={`flex items-start gap-3 p-4 border rounded-lg ${!voucher.accountsSignedBy ? "bg-muted/60 opacity-80" : "bg-muted/40"}`}>
                                <input 
                                    type="checkbox" 
                                    id="admin-approve"
                                    checked={adminApprove} 
                                    disabled={!voucher.accountsSignedBy}
                                    onChange={e => setAdminApprove(e.target.checked)} 
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
                                />
                                <div className="space-y-1">
                                    <label htmlFor="admin-approve" className={`text-sm font-medium leading-none ${!voucher.accountsSignedBy ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                        Approve this voucher
                                    </label>
                                    {!voucher.accountsSignedBy && (
                                        <p className="text-xs font-medium text-destructive mt-1">
                                            Accounts approval is required first.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Already Approved by CEO</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setAdminModalOpen(false)} className="w-24">
                                Cancel
                            </Button>
                            <Button type="submit" className="w-32">
                                <CheckCircle className="h-4 w-4 mr-2" />
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
                .voucher-items td:nth-child(3) { width: 20%; }

                .voucher-items th:nth-child(4),
                .voucher-items td:nth-child(4) { width: 12%; }

                .voucher-items th:nth-child(5),
                .voucher-items td:nth-child(5) { width: 29%; }

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
                    font-size: 9px;        /* project name + code */
                    letter-spacing: 0.2px;
                    min-width: 38mm;
                }

                html.pdf-export .voucher-items th:nth-child(4),
                html.pdf-export .voucher-items td:nth-child(4) {
                    font-size: 9px;        /* date of expense */
                    letter-spacing: 0.2px;
                    min-width: 22mm;
                }

                html.pdf-export .voucher-items th:nth-child(5),
                html.pdf-export .voucher-items td:nth-child(5) {
                    min-width: 28mm;       /* remarks */
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
                html.pdf-export .voucher-toolbar {
                    display: none !important;
                }

                .voucher-items td:nth-child(3) span:last-child {
                    font-size: 10px;
                }
            `}</style>
        </div>
    );
};

export default ImprestVoucherView;
