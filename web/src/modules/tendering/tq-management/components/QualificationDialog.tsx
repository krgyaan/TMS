import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';

interface QualificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (qualified: boolean, disqualificationReason?: string) => void;
    title: string;
    description: string;
}

export default function QualificationDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
}: QualificationDialogProps) {
    const [status, setStatus] = useState<string>('');
    const [reason, setReason] = useState('');

    // Reset local states when dialog visibility changes
    useEffect(() => {
        if (!open) {
            setStatus('');
            setReason('');
        }
    }, [open]);

    const handleSubmit = () => {
        if (!status) return;
        const isQualified = status === 'qualified';
        onConfirm(isQualified, isQualified ? undefined : reason.trim());
        onOpenChange(false);
    };

    const isSubmitDisabled = !status || (status === 'disqualified' && !reason.trim());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Status <span className="text-destructive">*</span>
                        </label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select qualification status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="disqualified">Disqualified</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {status === 'disqualified' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                            <label className="text-sm font-medium text-foreground">
                                Reason for Disqualification <span className="text-destructive">*</span>
                            </label>
                            <Textarea
                                placeholder="State the reason for disqualification..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={4}
                                className="w-full resize-none"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        className="w-full sm:w-auto"
                    >
                        Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
