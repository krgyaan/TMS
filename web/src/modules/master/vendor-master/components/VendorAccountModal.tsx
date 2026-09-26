import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard } from "lucide-react";
import type { VendorAcc } from "@/types/api.types";

export function VendorAccountModal({
    open,
    onOpenChange,
    data,
    orgName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: VendorAcc[];
    orgName: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Bank Accounts - {orgName}
                    </DialogTitle>
                    <DialogDescription>Total Bank Accounts: {data.length}</DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                    {data.length > 0 ? (
                        <div className="space-y-3">
                            {data.map((account, index) => (
                                <div key={account.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                                                <div className="font-medium">{account.bankAccountName}</div>
                                            </div>
                                            <div className="ml-11 space-y-1">
                                                <div className="text-sm text-muted-foreground">
                                                    <span className="font-medium">Account:</span>{" "}
                                                    <span className="font-mono">{account.accountNum}</span>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    <span className="font-medium">IFSC:</span>{" "}
                                                    <span className="font-mono">{account.ifscCode}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant={account.status ? "default" : "secondary"}>{account.status ? "Active" : "Inactive"}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <CreditCard className="h-12 w-12 mb-4 opacity-50" />
                            <p>No bank accounts found for this organization</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
