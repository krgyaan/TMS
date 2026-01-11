import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
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
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadField } from '@/components/form/FileUploadField';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { StopReasonFields } from '@/components/form/StopReasonFields';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import { ChequeActionFormSchema, type ChequeActionFormValues } from '../helpers/chequeActionForm.schema';
import { useUpdateChequeAction } from '@/hooks/api/useCheques';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form (CHQ) 1 - Request to Bank' },
    { value: 'accounts-form-2', label: 'Accounts Form (CHQ) 2 - After Cheque Creation' },
    { value: 'accounts-form-3', label: 'Accounts Form (CHQ) 3 - Capture Cheque Details' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned-courier', label: 'Returned via Courier' },
    { value: 'request-cancellation', label: 'Request Cancellation' },
];

interface ChequeActionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    instrumentId: number;
    instrumentData?: {
        chequeNo?: string;
        chequeDate?: Date;
        amount?: number;
        tenderName?: string;
        tenderNo?: string;
    };
}

export function ChequeActionForm({
    open,
    onOpenChange,
    instrumentId,
    instrumentData,
}: ChequeActionFormProps) {
    const updateMutation = useUpdateChequeAction();
    const [fileUploads, setFileUploads] = useState<Record<string, File[]>>({});

    const form = useForm<ChequeActionFormValues>({
        resolver: zodResolver(ChequeActionFormSchema) as Resolver<ChequeActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
            cheque_images: [],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const chequeReq = useWatch({ control: form.control, name: 'cheque_req' });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: ChequeActionFormValues) => {
        try {
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                if (key === 'contacts' || key.includes('_imran') || key.includes('prefilled') || key.includes('_slip') || key.includes('covering') || key.includes('cheque_images') || key.includes('proof_image')) {
                    return;
                }
                if (value === undefined || value === null || value === '') return;
                if (value instanceof Date) {
                    formData.append(key, value.toISOString());
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            });

            if (values.contacts && values.contacts.length > 0) {
                formData.append('contacts', JSON.stringify(values.contacts));
            }

            const allFiles: File[] = [];
            if (values.cheque_format_imran && fileUploads.cheque_format_imran) {
                allFiles.push(...fileUploads.cheque_format_imran);
            }
            if (values.prefilled_signed_cheque && fileUploads.prefilled_signed_cheque) {
                allFiles.push(...fileUploads.prefilled_signed_cheque);
            }
            if (values.cheque_images && fileUploads.cheque_images) {
                allFiles.push(...fileUploads.cheque_images);
            }
            if (values.docket_slip && fileUploads.docket_slip) {
                allFiles.push(...fileUploads.docket_slip);
            }
            if (values.covering_letter && fileUploads.covering_letter) {
                allFiles.push(...fileUploads.covering_letter);
            }
            if (values.proof_image && fileUploads.proof_image) {
                allFiles.push(...fileUploads.proof_image);
            }

            allFiles.forEach((file) => {
                formData.append('files', file);
            });

            await updateMutation.mutateAsync({ id: instrumentId, formData });
            toast.success('Action submitted successfully');
            onOpenChange(false);
            form.reset();
            setFileUploads({});
        } catch (error: any) {
            toast.error(error?.message || 'Failed to submit action');
            console.error('Error submitting action:', error);
        }
    };

    useEffect(() => {
        if (!open) {
            form.reset();
            setFileUploads({});
        }
    }, [open, form]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Cheque Action Form</DialogTitle>
                    <DialogDescription>
                        {instrumentData?.tenderNo && instrumentData?.tenderName
                            ? `${instrumentData.tenderNo} - ${instrumentData.tenderName}`
                            : `Instrument ID: ${instrumentId}`}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <FieldWrapper control={form.control} name="action" label="Action *">
                            {(field) => (
                                <SelectField
                                    control={form.control}
                                    name="action"
                                    options={ACTION_OPTIONS}
                                    placeholder="Select an action"
                                />
                            )}
                        </FieldWrapper>

                        {/* Accounts Form (CHQ) 1 */}
                        <ConditionalSection show={action === 'accounts-form-1'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (CHQ) 1 - Request to Bank</h4>

                                <FieldWrapper control={form.control} name="cheque_req" label="Cheque Request">
                                    {(field) => (
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Accepted" id="chq_req_accepted" />
                                                <Label htmlFor="chq_req_accepted">Accepted</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Rejected" id="chq_req_rejected" />
                                                <Label htmlFor="chq_req_rejected">Rejected</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                </FieldWrapper>

                                {chequeReq === 'Rejected' && (
                                    <FieldWrapper control={form.control} name="reason_req" label="Reason for Rejection *">
                                        {(field) => (
                                            <Textarea
                                                {...field}
                                                placeholder="Enter reason for rejection"
                                                className="min-h-[80px]"
                                            />
                                        )}
                                    </FieldWrapper>
                                )}

                                <FieldWrapper control={form.control} name="cheque_format_imran" label="Cheque Format (Upload by Imran)">
                                    {(field) => (
                                        <FileUploadField
                                            control={form.control}
                                            name="cheque_format_imran"
                                            label=""
                                            allowMultiple={false}
                                            acceptedFileTypes={['application/pdf', 'image/*']}
                                            onChange={(files) => {
                                                setFileUploads((prev) => ({ ...prev, cheque_format_imran: files }));
                                            }}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="prefilled_signed_cheque" label="Prefilled Bank Formats">
                                    {(field) => (
                                        <FileUploadField
                                            control={form.control}
                                            name="prefilled_signed_cheque"
                                            label=""
                                            allowMultiple={true}
                                            acceptedFileTypes={['application/pdf', 'image/*']}
                                            onChange={(files) => {
                                                setFileUploads((prev) => ({ ...prev, prefilled_signed_cheque: files }));
                                            }}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Accounts Form (CHQ) 2 */}
                        <ConditionalSection show={action === 'accounts-form-2'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (CHQ) 2 - After Cheque Creation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="cheque_no" label="Cheque No.">
                                        {(field) => <Input {...field} placeholder="Enter cheque number" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_date" label="Cheque Date">
                                        {(field) => (
                                            <DatePicker
                                                date={field.value ? new Date(field.value) : undefined}
                                                onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_amount" label="Cheque Amount">
                                        {(field) => <Input {...field} type="number" placeholder="Enter amount" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_type" label="Cheque Type">
                                        {(field) => <Input {...field} placeholder="Enter cheque type" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_reason" label="Cheque Reason">
                                        {(field) => <Input {...field} placeholder="Enter reason" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="due_date" label="Due Date">
                                        {(field) => (
                                            <DatePicker
                                                date={field.value ? new Date(field.value) : undefined}
                                                onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>

                                <FieldWrapper control={form.control} name="courier_request_no" label="Courier Request No.">
                                    {(field) => <Input {...field} placeholder="Enter courier request number" />}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                    {(field) => (
                                        <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Accounts Form (CHQ) 3 */}
                        <ConditionalSection show={action === 'accounts-form-3'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (CHQ) 3 - Capture Cheque Details</h4>

                                <FieldWrapper control={form.control} name="cheque_images" label="Cheque Images (Max 2)">
                                    {(field) => (
                                        <FileUploadField
                                            control={form.control}
                                            name="cheque_images"
                                            label=""
                                            allowMultiple={true}
                                            acceptedFileTypes={['image/*']}
                                            onChange={(files) => {
                                                if (files.length <= 2) {
                                                    setFileUploads((prev) => ({ ...prev, cheque_images: files }));
                                                }
                                            }}
                                        />
                                    )}
                                </FieldWrapper>

                                <h5 className="font-medium text-sm mt-4">Charges</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="cheque_charges" label="Cheque Charges">
                                        {(field) => <Input {...field} type="number" placeholder="Enter charges" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="stamp_charges" label="Stamp Charges">
                                        {(field) => <Input {...field} type="number" placeholder="Enter charges" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="other_charges" label="Other Charges">
                                        {(field) => <Input {...field} type="number" placeholder="Enter charges" />}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </ConditionalSection>

                        {/* Initiate Followup */}
                        <ConditionalSection show={action === 'initiate-followup'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Initiate Followup</h4>

                                <FieldWrapper control={form.control} name="organisation_name" label="Organisation Name">
                                    {(field) => <Input {...field} placeholder="Enter organisation name" />}
                                </FieldWrapper>

                                <ContactPersonFields control={form.control} name="contacts" />

                                <FieldWrapper control={form.control} name="followup_start_date" label="Follow-up Start Date">
                                    {(field) => (
                                        <DatePicker
                                            date={field.value ? new Date(field.value) : undefined}
                                            onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                        />
                                    )}
                                </FieldWrapper>

                                <FollowUpFrequencySelect control={form.control} name="frequency" />

                                <StopReasonFields
                                    control={form.control}
                                    frequencyFieldName="frequency"
                                    stopReasonFieldName="stop_reason"
                                    proofTextFieldName="proof_text"
                                    stopRemarksFieldName="stop_remarks"
                                    proofImageFieldName="proof_image"
                                />
                            </div>
                        </ConditionalSection>

                        {/* Returned via courier */}
                        <ConditionalSection show={action === 'returned-courier'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Returned via Courier</h4>

                                <FieldWrapper control={form.control} name="docket_no" label="Docket No.">
                                    {(field) => <Input {...field} placeholder="Enter docket number" />}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="docket_slip" label="Docket Slip Upload">
                                    {(field) => (
                                        <FileUploadField
                                            control={form.control}
                                            name="docket_slip"
                                            label=""
                                            allowMultiple={false}
                                            acceptedFileTypes={['application/pdf', 'image/*']}
                                            onChange={(files) => {
                                                setFileUploads((prev) => ({ ...prev, docket_slip: files }));
                                            }}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Request Cancellation */}
                        <ConditionalSection show={action === 'request-cancellation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Request Cancellation</h4>

                                <FieldWrapper control={form.control} name="covering_letter" label="Covering Letter Upload">
                                    {(field) => (
                                        <FileUploadField
                                            control={form.control}
                                            name="covering_letter"
                                            label=""
                                            allowMultiple={false}
                                            acceptedFileTypes={['application/pdf', 'image/*']}
                                            onChange={(files) => {
                                                setFileUploads((prev) => ({ ...prev, covering_letter: files }));
                                            }}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="cancellation_remarks" label="Remarks">
                                    {(field) => (
                                        <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Cheque Cancellation Confirmation */}
                        <ConditionalSection show={action === 'cheque-cancellation-confirmation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Cheque Cancellation Confirmation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="cheque_cancellation_date" label="Date">
                                        {(field) => (
                                            <DatePicker
                                                date={field.value ? new Date(field.value) : undefined}
                                                onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_cancellation_amount" label="Amount">
                                        {(field) => <Input {...field} type="number" placeholder="Enter amount" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_cancellation_reference_no" label="Reference No.">
                                        {(field) => <Input {...field} placeholder="Enter reference number" />}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </ConditionalSection>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
