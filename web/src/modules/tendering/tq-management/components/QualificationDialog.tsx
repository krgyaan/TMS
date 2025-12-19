import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

interface QualificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (qualified: boolean) => void;
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
    const handleQualified = () => {
        onConfirm(true);
        onOpenChange(false);
    };

    const handleDisqualified = () => {
        onConfirm(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Please select whether this tender is Qualified or Disqualified:
                    </p>
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
                        variant="destructive"
                        onClick={handleDisqualified}
                        className="w-full sm:w-auto"
                    >
                        <XCircle className="mr-2 h-4 w-4" />
                        Disqualified
                    </Button>
                    <Button
                        onClick={handleQualified}
                        className="w-full sm:w-auto"
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Qualified
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
