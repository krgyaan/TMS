import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const ConfirmUnapproveDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    label: string;
    onConfirm: () => void;
}> = ({ open, onOpenChange, label, onConfirm }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>Remove {label}?</DialogTitle>
                <DialogDescription>
                    Are you sure you want to mark this record as <strong>not {label.toLowerCase()}</strong>?
                </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button variant="destructive" onClick={onConfirm}>
                    Yes, Remove
                </Button>
            </div>
        </DialogContent>
    </Dialog>
);