import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { toast } from 'sonner';
import { ContractAgreementFormSchema, type ContractAgreementFormValues } from '../helpers/contractAgreement.schema';
import { useSaveContractAgreement } from '@/hooks/api/useContractAgreement';
import type { ContractAgreementListDto } from '@/modules/operations/types/wo.types';

interface UploadContractAgreementDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    woDetail: ContractAgreementListDto;
}

export function UploadContractAgreementDialog({ isOpen, onOpenChange, woDetail }: UploadContractAgreementDialogProps) {
    const updateContractAgreementMutation = useSaveContractAgreement();

    const form = useForm<ContractAgreementFormValues>({
        resolver: zodResolver(ContractAgreementFormSchema),
        defaultValues: {
            veSigned: undefined,
            clientAndVeSigned: undefined,
            veSignedDate: undefined,
            clientAndVeSignedDate: undefined,
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                veSigned: undefined,
                clientAndVeSigned: undefined,
                veSignedDate: undefined,
                clientAndVeSignedDate: undefined,
            });
        }
    }, [isOpen, form]);

    const isSubmitting = updateContractAgreementMutation.isPending;

    const handleSubmit: SubmitHandler<ContractAgreementFormValues> = async (values) => {
        try {
            await updateContractAgreementMutation.mutateAsync({
                id: woDetail.id,
                veSigned: values.veSigned,
                clientAndVeSigned: values.clientAndVeSigned,
                veSignedDate: values.veSignedDate,
                clientAndVeSignedDate: values.clientAndVeSignedDate,
            });
            toast.success('Contract Agreement uploaded successfully');
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to upload Contract Agreement');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Contract Agreement</DialogTitle>
                    <DialogDescription>
                        Upload the Contract Agreement document for the work order.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <FieldWrapper control={form.control} name="veSigned" label="VE Signed">
                            {(field) => (
                                <TenderFileUploader
                                    context="contract-agreement"
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            )}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="clientAndVeSigned" label="Client and VE Signed">
                            {(field) => (
                                <TenderFileUploader
                                    context="contract-agreement"
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            )}
                        </FieldWrapper>
                        <p className="text-xs text-muted-foreground">
                            Wo Detail Id: {woDetail.woDetailId}
                        </p>

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
