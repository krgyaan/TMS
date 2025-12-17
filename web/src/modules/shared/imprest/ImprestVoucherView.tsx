import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useImprestVoucherView, useAccountApproveVoucher, useAdminApproveVoucher } from "./imprest.hooks";
import { useCurrentUser as useAuth } from "@/hooks/api/useAuth";

const ImprestVoucherView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const voucherId = Number(id);

    const { user } = useAuth();
    const { data, isLoading, refetch } = useImprestVoucherView(voucherId);

    const accountApproveMutation = useAccountApproveVoucher();
    const adminApproveMutation = useAdminApproveVoucher();

    const [accModalOpen, setAccModalOpen] = React.useState(false);
    const [adminModalOpen, setAdminModalOpen] = React.useState(false);
    const [remark, setRemark] = React.useState("");
    const [approve, setApprove] = React.useState(false);

    if (isLoading) return <div>Loading…</div>;
    if (!data) return <div>Voucher not found</div>;

    const { voucher, items } = data;

    /* -------------------- HANDLERS -------------------- */
    const handleAccountSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        accountApproveMutation.mutate(
            { id: voucher.id, remark, approve },
            {
                onSuccess: () => {
                    setAccModalOpen(false);
                    setRemark("");
                    setApprove(false);
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
                    setRemark("");
                    setApprove(false);
                    refetch();
                },
            }
        );
    };

    return (
        <Card>
            <CardContent className="space-y-6">
                {/* -------------------- HEADER -------------------- */}
                <h2 className="text-xl font-bold">Expense Report</h2>

                <div className="space-y-1">
                    <p>
                        <b>Voucher No:</b> {voucher.voucherCode}
                    </p>
                    <p>
                        <b>Period:</b> {new Date(voucher.validFrom).toLocaleDateString("en-GB")} – {new Date(voucher.validTo).toLocaleDateString("en-GB")}
                    </p>
                </div>

                {/* -------------------- ITEMS -------------------- */}
                <table className="w-full border border-collapse">
                    <thead>
                        <tr className="border">
                            <th className="border p-2">Project</th>
                            <th className="border p-2">Remark</th>
                            <th className="border p-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(i => (
                            <tr key={i.id}>
                                <td className="border p-2">{i.projectName}</td>
                                <td className="border p-2">{i.remark}</td>
                                <td className="border p-2 text-right">{i.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* -------------------- APPROVAL STATUS -------------------- */}
                <div className="space-y-1">
                    <p>
                        <b>Accounts Approval:</b> {voucher.accountsSignedBy ? <span className="text-green-600">Approved</span> : <span className="text-red-600">Pending</span>}
                    </p>

                    {voucher.accountsRemark && (
                        <p className="text-sm text-muted-foreground">
                            <b>Accounts Remark:</b> {voucher.accountsRemark}
                        </p>
                    )}

                    <p>
                        <b>Admin Approval:</b> {voucher.adminSignedBy ? <span className="text-green-600">Approved</span> : <span className="text-red-600">Pending</span>}
                    </p>

                    {voucher.adminRemark && (
                        <p className="text-sm text-muted-foreground">
                            <b>Admin Remark:</b> {voucher.adminRemark}
                        </p>
                    )}
                </div>

                {/* -------------------- ACTIONS -------------------- */}
                <div className="flex justify-center gap-3 pt-4">
                    {user?.role?.startsWith("account") && !voucher.accountsSignedBy && (
                        <Button variant="outline" onClick={() => setAccModalOpen(true)}>
                            Approve by Accounts
                        </Button>
                    )}

                    {user?.role === "admin" && !voucher.adminSignedBy && (
                        <Button variant="outline" onClick={() => setAdminModalOpen(true)}>
                            Approve by Admin
                        </Button>
                    )}

                    <Button onClick={() => window.print()}>Print</Button>
                </div>
            </CardContent>

            {/* -------------------- ACCOUNT MODAL -------------------- */}
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
                            <Button variant="outline" type="button" onClick={() => setAccModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={accountApproveMutation.isLoading}>
                                Submit
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* -------------------- ADMIN MODAL -------------------- */}
            <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve by Admin</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAdminSubmit} className="space-y-4">
                        <Textarea placeholder="Remark" value={remark} onChange={e => setRemark(e.target.value)} />

                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={approve} onChange={e => setApprove(e.target.checked)} />
                            Approve it
                        </label>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => setAdminModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={adminApproveMutation.isLoading}>
                                Submit
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default ImprestVoucherView;
