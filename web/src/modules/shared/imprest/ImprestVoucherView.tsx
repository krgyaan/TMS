import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImprestVoucherView } from "./imprest.hooks";
import { columnDropStylePlain } from "ag-grid-community";

const ImprestVoucherView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    console.log("UserId from params:", id);
    const { data, isLoading } = useImprestVoucherView(Number(id));
    console.log("Fetched voucher details:", data);

    if (isLoading) return <div>Loading…</div>;
    if (!data) return <div>Voucher not found</div>;

    const { voucher, items } = data;

    return (
        <Card>
            <CardContent className="space-y-6">
                <h2 className="text-xl font-bold">Expense Report</h2>

                <div>
                    <p>Voucher No: {voucher.voucherCode}</p>
                    <p>
                        Period: {new Date(voucher.validFrom).toLocaleDateString("en-GB")} - {new Date(voucher.validTo).toLocaleDateString("en-GB")}
                    </p>
                </div>

                <table className="w-full border">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Remark</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(i => (
                            <tr key={i.id}>
                                <td>{i.projectName}</td>
                                <td>{i.remark}</td>
                                <td>{i.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex gap-2">
                    <Button onClick={() => window.print()}>Print</Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default ImprestVoucherView;
