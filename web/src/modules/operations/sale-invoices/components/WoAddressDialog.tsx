import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export interface WoAddressPayload {
    customerName: string;
    address: string;
    gst: string;
}

interface WoAddressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "billing" | "shipping";
    onSubmit: (data: WoAddressPayload) => void;
    isLoading?: boolean;
}

export function WoAddressDialog({ open, onOpenChange, type, onSubmit, isLoading = false }: WoAddressDialogProps) {
    const [customerName, setCustomerName] = useState("");
    const [address, setAddress] = useState("");
    const [gst, setGst] = useState("");

    useEffect(() => {
        if (open) {
            setCustomerName("");
            setAddress("");
            setGst("");
        }
    }, [open]);

    const canSubmit = customerName.trim() && address.trim();

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit({ customerName: customerName.trim(), address: address.trim(), gst: gst.trim() });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add New {type === "billing" ? "Billing" : "Shipping"} Address</DialogTitle>
                    <DialogDescription>
                        Saved to this work order and available for future sale invoices.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor={`wo-addr-name-${type}`}>
                            Customer Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id={`wo-addr-name-${type}`}
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter customer name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`wo-addr-address-${type}`}>
                            Address <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id={`wo-addr-address-${type}`}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter full address"
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`wo-addr-gst-${type}`}>GST Number</Label>
                        <Input
                            id={`wo-addr-gst-${type}`}
                            value={gst}
                            onChange={(e) => setGst(e.target.value.toUpperCase())}
                            placeholder="e.g. 27ABCDE1234F1Z5"
                            className="font-mono"
                            maxLength={15}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Address
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
