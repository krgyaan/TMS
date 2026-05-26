import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { uploadCancelledTenderResult } from '@/hooks/api/useTenderResults';
import { XCircle, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { CancelTenderSchema } from "../helpers/tenderResult.schema" 
import type {CancelTenderDto as FormValues} from "../helpers/tenderResult.schema";

interface CancelTenderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenderId: number | null;
    tenderNo?: string;
    tenderName?: string;
    onSuccess?: () => void;
}

export function CancelTenderModal({
    open,
    onOpenChange,
    tenderId,
    tenderNo = '',
    tenderName = '',
    onSuccess,
}: CancelTenderModalProps) {
    const uploadResultMutation = uploadCancelledTenderResult();
    const [step, setStep] = useState<'form' | 'confirm'>('form');
    const [savedData, setSavedData] = useState<FormValues | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(CancelTenderSchema),
        defaultValues: {
            resultReason: '',
            finalResultScreenshot: '',
        },
    });

    const finalResultScreenshot = useWatch({ control: form.control, name: 'finalResultScreenshot' });
    const isSubmitting = form.formState.isSubmitting;

    // Reset modal state when opened/closed
    useEffect(() => {
        if (open) {
            form.reset({
                resultReason: '',
                finalResultScreenshot: '',
            });
            setStep('form');
            setSavedData(null);
        }
    }, [open, form]);

    const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
        setSavedData(data);
        setStep('confirm');
    };

    const handleConfirmCancel = async () => {
        if (!tenderId || !savedData) return;

        try {
            await uploadResultMutation.mutateAsync({
                tenderId,
                data: {
                    resultReason: savedData.resultReason,
                    finalResultScreenshot: savedData.finalResultScreenshot || null,
                },
            });
            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error cancelling tender:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg border-destructive/20 shadow-2xl overflow-hidden rounded-2xl p-0">
                {step === 'form' ? (
                    <>
                        <DialogHeader className="bg-destructive/5 px-6 py-5 border-b border-destructive/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                                    <XCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-destructive">
                                        Cancel Tender
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                                        {tenderNo} - {tenderName}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="p-6 space-y-5">
                                {/* Reason textarea */}
                                <FieldWrapper
                                    control={form.control}
                                    name="resultReason"
                                    label="Reason for Cancellation"
                                    description="Provide a clear explanation of why this tender was cancelled."
                                >
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            rows={4}
                                            placeholder="e.g. Department cancelled the tender, technical requirements changed, or budget got rejected..."
                                            className="border-destructive/20 focus:ring-destructive/30 focus:border-destructive/30"
                                        />
                                    )}
                                </FieldWrapper>

                                {/* File Uploader */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                                        Upload Proof <span className="text-destructive">*</span>
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Upload official cancellation order, corrigendum notice, or portal screenshot.
                                    </p>
                                    <div className="border border-dashed border-destructive/20 rounded-xl p-3 bg-destructive/5 mt-2">
                                        <TenderFileUploader
                                            context="cancel-tender"
                                            value={finalResultScreenshot ? [finalResultScreenshot] : []}
                                            onChange={(paths) => form.setValue('finalResultScreenshot', paths[0] || '')}
                                            label="Upload official proof file"
                                            disabled={isSubmitting}
                                        />
                                        {form.formState.errors.finalResultScreenshot && (
                                            <p className="text-xs font-semibold text-destructive mt-1.5">
                                                {form.formState.errors.finalResultScreenshot.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <DialogFooter className="pt-4 border-t border-muted-foreground/10 flex gap-2 justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                        disabled={isSubmitting}
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        disabled={isSubmitting}
                                    >
                                        Proceed to Cancel
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </>
                ) : (
                    <div className="p-6 text-center space-y-6">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive animate-bounce">
                            <AlertTriangle className="h-7 w-7" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-foreground">
                                Confirm Permanent Cancellation?
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                Are you absolutely sure you want to cancel the tender <strong className="text-foreground">{tenderNo}</strong>?
                            </p>
                            <p className="text-xs text-destructive/80 font-medium">
                                This action will update the status to "Tender Cancelled" and cannot be undone.
                            </p>
                        </div>

                        {/* Summary details in confirmation step */}
                        <div className="bg-muted/30 border rounded-xl p-3 text-left text-xs space-y-2 max-w-sm mx-auto">
                            <div className="flex gap-2">
                                <span className="font-semibold text-muted-foreground min-w-[70px]">Reason:</span>
                                <span className="text-foreground line-clamp-2">{savedData?.resultReason}</span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="font-semibold text-muted-foreground min-w-[70px]">Proof file:</span>
                                <span className="text-green-600 flex items-center gap-1 font-medium">
                                    <CheckCircle2 className="h-3 w-3" /> Ready
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep('form')}
                                disabled={isSubmitting}
                                className="w-28"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleConfirmCancel}
                                disabled={isSubmitting}
                                className="w-36 font-semibold"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                Confirm Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
