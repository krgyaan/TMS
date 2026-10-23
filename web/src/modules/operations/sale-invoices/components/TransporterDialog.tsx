import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export interface TransporterPayload {
    name: string;
    gstNo: string;
    phone: string;
    address: string;
}

interface TransporterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: TransporterPayload) => void;
    isLoading?: boolean;
}

export function TransporterDialog({ open, onOpenChange, onSubmit, isLoading = false }: TransporterDialogProps) {
    const [name, setName] = useState("");
    const [gstNo, setGstNo] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    useEffect(() => {
        if (open) {
            setName("");
            setGstNo("");
            setPhone("");
            setAddress("");
        }
    }, [open]);

    const canSubmit = name.trim().length > 0;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit({ name: name.trim(), gstNo: gstNo.trim(), phone: phone.trim(), address: address.trim() });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add New Transporter</DialogTitle>
                    <DialogDescription>Save transporter details for reuse across invoices.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="transporter-name">
                            Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="transporter-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Transporter name"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="transporter-gst">GST Number</Label>
                            <Input
                                id="transporter-gst"
                                value={gstNo}
                                onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                                placeholder="e.g. 27ABCDE1234F1Z5"
                                className="font-mono"
                                maxLength={15}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transporter-phone">Phone</Label>
                            <Input
                                id="transporter-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Contact number"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="transporter-address">Address</Label>
                        <Textarea
                            id="transporter-address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Transporter address"
                            rows={2}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Transporter
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
