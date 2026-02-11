import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useCreateImprestCredit } from "../imprest-admin.hooks";

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    userId: number;
    userName: string;
}

const today = new Date().toISOString().split("T")[0];

export const PayImprestDialog: React.FC<Props> = ({ open, onOpenChange, userId, userName }) => {
    const mutation = useCreateImprestCredit();

    const [date, setDate] = useState(today);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        await mutation.mutateAsync({
            userId,
            txnDate: date,
            teamMemberName: userName,
            amount: Number(amount),
            projectName: note || undefined,
        });

        onOpenChange(false);
        setAmount("");
        setNote("");
        setDate(today);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pay Imprest to {userName}</DialogTitle>
                    <DialogDescription>Credit imprest amount to this employee.</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="text-sm">Date</label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>

                    <div>
                        <label className="text-sm">Employee</label>
                        <Input value={userName} disabled />
                    </div>

                    <div>
                        <label className="text-sm">Amount</label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                    </div>

                    <div>
                        <label className="text-sm">Note (optional)</label>
                        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Project / remark" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>

                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Pay Imprest
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
