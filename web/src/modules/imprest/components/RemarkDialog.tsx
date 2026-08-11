import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const RemarkDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    text: string;
    setText: (text: string) => void;
    onSubmit: (e?: React.FormEvent) => void;
}> = ({ open, onOpenChange, text, setText, onSubmit }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Add Remark</DialogTitle>
                <DialogDescription>Add a note or comment for this imprest record.</DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4">
                <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter your remark…" rows={4} />

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!text.trim()}>
                        Save
                    </Button>
                </div>
            </form>
        </DialogContent>
    </Dialog>
);