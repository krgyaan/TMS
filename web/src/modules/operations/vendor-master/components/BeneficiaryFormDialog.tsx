import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Landmark, Loader2, UserPlus } from "lucide-react";
import type { BeneficiaryFormValues } from "../vendor-master.types";

interface BeneficiaryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: BeneficiaryFormValues) => void;
    isLoading?: boolean;
    title?: string;
    description?: string;
    initialValues?: Partial<BeneficiaryFormValues>;
}

export function BeneficiaryFormDialog({
    open,
    onOpenChange,
    onSubmit,
    isLoading = false,
    title = "Add Beneficiary",
    description = "Add a beneficiary to use as the payment receiving bank account.",
    initialValues,
}: BeneficiaryFormDialogProps) {
    const [form, setForm] = useState<BeneficiaryFormValues>({
        name: "",
        accountNumber: "",
        ifsc: "",
        bankName: "",
    });

    useEffect(() => {
        if (open) {
            setForm({
                name: "",
                accountNumber: "",
                ifsc: "",
                bankName: "",
                ...initialValues,
            });
        }
    }, [open, initialValues]);

    const handleChange = (field: keyof BeneficiaryFormValues, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!form.name.trim()) return;
        onSubmit(form);
    };

    const isFormValid = form.name.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                            Beneficiary Name
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="Enter beneficiary name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                            value={form.accountNumber}
                            onChange={(e) => handleChange("accountNumber", e.target.value)}
                            placeholder="Enter bank account number"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>IFSC Code</Label>
                            <Input
                                value={form.ifsc}
                                onChange={(e) => handleChange("ifsc", e.target.value.toUpperCase())}
                                placeholder="SBIN0000000"
                                className="font-mono"
                                maxLength={11}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                                Bank Name
                            </Label>
                            <Input
                                value={form.bankName}
                                onChange={(e) => handleChange("bankName", e.target.value)}
                                placeholder="Enter bank name"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isFormValid || isLoading}
                        className="min-w-[100px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Save
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default BeneficiaryFormDialog;