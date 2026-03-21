import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { toast } from 'sonner';

import { useUpdateKickoffMom } from '@/hooks/api/useKickoffMeeting';

const MomUploadSchema = z.object({
    momFilePath: z.array(z.string()).min(1, 'Please select a file to upload'),
});

type MomUploadFormValues = z.infer<typeof MomUploadSchema>;

interface WoUploadMomDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    woDetailId: number;
    kickoffMeetingId: number;
    existingMomPath?: string | null;
}

export function WoUploadMomDialog({
    isOpen,
    onOpenChange,
    woDetailId,
    kickoffMeetingId,
    existingMomPath,
}: WoUploadMomDialogProps) {
    const updateMomMutation = useUpdateKickoffMom(woDetailId);

    const form = useForm<MomUploadFormValues>({
        resolver: zodResolver(MomUploadSchema),
        defaultValues: {
            momFilePath: [],
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                momFilePath: existingMomPath ? [existingMomPath] : [],
            });
        }
    }, [isOpen, existingMomPath, form]);

    const isSubmitting = updateMomMutation.isPending;

    const handleSubmit: SubmitHandler<MomUploadFormValues> = async (values) => {
        try {
            await updateMomMutation.mutateAsync({
                id: kickoffMeetingId,
                data: {
                    momFilePath: values.momFilePath[0],
                },
            });
            toast.success('MOM uploaded successfully');
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to upload MOM');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Minutes of Meeting</DialogTitle>
                    <DialogDescription>
                        Upload the MOM document for the kick-off meeting.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <FieldWrapper control={form.control} name="momFilePath" label="MOM File">
                            {(field) => (
                                <TenderFileUploader
                                    context="kickoff-mom"
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            )}
                        </FieldWrapper>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Uploading...' : 'Upload'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
