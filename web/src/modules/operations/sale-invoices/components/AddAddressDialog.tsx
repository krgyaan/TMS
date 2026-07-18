import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin } from "lucide-react";

interface AddressForm {
    customerName: string;
    address: string;
    gst: string;
}

interface AddAddressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    address: AddressForm;
    setAddress: (addr: AddressForm) => void;
    onSubmit: () => void;
    isLoading?: boolean;
    title?: string;
}

export function AddAddressDialog({
    open,
    onOpenChange,
    address,
    setAddress,
    onSubmit,
    isLoading = false,
    title = "Add New Address",
}: AddAddressDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>Enter the address details below.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>
                            Customer Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={address.customerName}
                            onChange={(e) => setAddress({ ...address, customerName: e.target.value })}
                            placeholder="Enter customer name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Address <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            value={address.address}
                            onChange={(e) => setAddress({ ...address, address: e.target.value })}
                            placeholder="Enter complete address"
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>GST Number</Label>
                        <Input
                            value={address.gst}
                            onChange={(e) => setAddress({ ...address, gst: e.target.value.toUpperCase() })}
                            placeholder="e.g. 27ABCDE1234F1Z5"
                            className="font-mono"
                            maxLength={15}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={!address.customerName.trim() || !address.address.trim() || isLoading}
                    >
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                        ) : (
                            <><MapPin className="mr-2 h-4 w-4" />Add Address</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
