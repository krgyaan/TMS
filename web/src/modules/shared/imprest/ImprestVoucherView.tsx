import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useImprestVoucherView, useAccountApproveVoucher, useAdminApproveVoucher } from "./imprest.hooks";

import { useAuth } from "@/contexts/AuthContext";

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
    const { canRead, user } = useAuth();

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

    const handlePrint = () => {
        window.print();
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
                            <td colSpan={4} className="pt-3">
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
                {!voucher.accountsSignedBy && (
                    <Button variant="outline" onClick={() => setAccModalOpen(true)}>
                        Approve by Accounts
                    </Button>
                )}

                {!voucher.adminSignedBy && (
                    <Button variant="outline" onClick={() => setAdminModalOpen(true)}>
                        Approve by CEO
                    </Button>
                )}

                <Button onClick={handlePrint}>Print</Button>
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
                .voucher-container { padding:24px; }
                table { width:100%; border-collapse:collapse; }
                th, td { padding:6px; }
                .voucher-items, .voucher-items th, .voucher-items td {
                    border:1px solid #000;
                }
                .voucher-items .wrap { white-space:pre-wrap; }
                .voucher-signatures { width:50%; margin-top:40px; }
                .voucher-signatures img { height:40px; width:120px; object-fit:contain; }
                .text-right { text-align:right; }
                .voucher-actions { display:flex; justify-content:center; gap:12px; margin-top:24px; }
                @media print {
                    button, .voucher-toolbar, .voucher-actions { display:none !important; }
                    body { background:#fff; color:#000; }
                    table, th, td { border:1px solid #000 !important; }
                }
            `}</style>
        </div>
    );
};

export default ImprestVoucherView;
