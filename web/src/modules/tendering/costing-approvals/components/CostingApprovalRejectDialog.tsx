import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { useRejectCosting } from '@/hooks/api/useCostingApprovals';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { XCircle } from 'lucide-react';

const RejectDetailSchema = z.object({
    rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

type RejectDetailFormValues = z.infer<typeof RejectDetailSchema>;

interface CostingApprovalRejectDialogProps {
    sheetId: number;
    detailId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function CostingApprovalRejectDialog({
    sheetId,
    detailId,
    open,
    onOpenChange,
    onSuccess,
}: CostingApprovalRejectDialogProps) {
    const rejectMutation = useRejectCosting();

    const form = useForm<RejectDetailFormValues>({
        resolver: zodResolver(RejectDetailSchema),
        defaultValues: { rejectionReason: '' },
    });

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit = async (data: RejectDetailFormValues) => {
        try {
            await rejectMutation.mutateAsync({
                id: sheetId,
                data: { detailId, rejectionReason: data.rejectionReason },
            });
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('Error rejecting detail:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-destructive">Reject Costing Detail</DialogTitle>
                    <DialogDescription>
                        Provide a detailed reason for rejecting this costing item.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FieldWrapper
                            control={form.control}
                            name="rejectionReason"
                            label="Reason for Rejection"
                        >
                            {(field) => (
                                <Textarea
                                    {...field}
                                    rows={4}
                                    placeholder="Provide a detailed explanation for rejecting this detail..."
                                    className="border-destructive focus:ring-destructive"
                                />
                            )}
                        </FieldWrapper>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                variant="destructive"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
