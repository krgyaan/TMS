import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/hooks/useFormatedDate";
import { Banknote } from "lucide-react";
import type { Beneficiary } from "../vendor-master.types";

interface BeneficiaryViewDialogProps {
    beneficiary: Beneficiary | null;
    open: boolean;
    onClose: () => void;
}

export const BeneficiaryViewDialog: React.FC<BeneficiaryViewDialogProps> = ({ beneficiary, open, onClose }) => {
    if (!beneficiary) return null;

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5" />
                        Beneficiary Details: {beneficiary.name}
                    </DialogTitle>
                    <DialogDescription>View beneficiary bank account information</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm text-muted-foreground">Name</span>
                            <p className="font-medium">{beneficiary.name || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Account Number</span>
                            <p className="font-medium">{beneficiary.accountNumber || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">IFSC</span>
                            <p className="font-medium">{beneficiary.ifsc || "-"}</p>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Bank Name</span>
                            <p className="font-medium">{beneficiary.bankName || "-"}</p>
                        </div>
                        <div className="col-span-2">
                            <span className="text-sm text-muted-foreground">Created At</span>
                            <p className="font-medium">{beneficiary.createdAt ? formatDate(beneficiary.createdAt) : "-"}</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BeneficiaryViewDialog;