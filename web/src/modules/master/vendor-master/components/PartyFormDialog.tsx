import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Loader2, Phone, UserPlus, User } from "lucide-react";
import { type NewPartyForm } from "./vendor-master.types";

interface PartyFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CreatePartyPayload) => void;
    isLoading?: boolean;
    title?: string;
    description?: string;
    initialValues?: Partial<NewPartyForm>;
}

export interface CreatePartyPayload {
    name: string;
    alias: string;
    email: string;
    address: string;
    gstNo: string;
    pan: string;
    msme: string;
    contact_person: string;
    mobile_number: string;
}

export function PartyFormDialog({
    open,
    onOpenChange,
    onSubmit,
    isLoading = false,
    title = "Add New Party",
    description = "Add a new party to use as vendor or shipping destination.",
    initialValues,
}: PartyFormDialogProps) {
    const [form, setForm] = useState<NewPartyForm>({
        name: "",
        alias: "",
        email: "",
        address: "",
        gstNo: "",
        pan: "",
        msme: "",
        contact_person: "",
        mobile_number: "",
        ...initialValues,
    });

    useEffect(() => {
        if (open) {
            setForm({
                name: "",
                alias: "",
                email: "",
                address: "",
                gstNo: "",
                pan: "",
                msme: "",
                contact_person: "",
                mobile_number: "",
                ...(initialValues || {}),
            });
        }
    }, [open, initialValues]);

    const handleChange = (field: keyof NewPartyForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!form.name.trim()) {
            return;
        }
        onSubmit(form);
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    const isFormValid = form.name.trim().length > 0;
    const isMobileValid = form.mobile_number.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Party Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="Enter party name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Alias</Label>
                            <Input
                                value={form.alias}
                                onChange={(e) => handleChange("alias", e.target.value)}
                                placeholder="e.g. Factory, HO, Branch"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                placeholder="example@email.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>
                                <span className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    Mobile Number
                                    <span className="text-destructive">*</span>
                                </span>
                            </Label>
                            <Input
                                value={form.mobile_number}
                                onChange={(e) => handleChange("mobile_number", e.target.value)}
                                placeholder="e.g. +91-9876543210"
                                maxLength={20}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Textarea
                            value={form.address}
                            onChange={(e) => handleChange("address", e.target.value)}
                            placeholder="Enter complete address"
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                GST Number
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent>15-character GST identification number</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </Label>
                            <Input
                                value={form.gstNo}
                                onChange={(e) => handleChange("gstNo", e.target.value.toUpperCase())}
                                placeholder="27ABCDE1234F1Z5"
                                className="font-mono"
                                maxLength={15}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                PAN Number
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent>10-character Permanent Account Number</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </Label>
                            <Input
                                value={form.pan}
                                onChange={(e) => handleChange("pan", e.target.value.toUpperCase())}
                                placeholder="ABCDE1234F"
                                className="font-mono"
                                maxLength={10}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                MSME Number
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent>Udyam Registration Number</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </Label>
                            <Input
                                value={form.msme}
                                onChange={(e) => handleChange("msme", e.target.value.toUpperCase())}
                                placeholder="UDYAM-XX-00-0000000"
                                className="font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                Contact Person
                            </Label>
                            <Input
                                value={form.contact_person}
                                onChange={(e) => handleChange("contact_person", e.target.value)}
                                placeholder="Enter contact person name"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isFormValid || !isMobileValid || isLoading}
                        className="min-w-[100px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Party
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { type NewPartyForm };
