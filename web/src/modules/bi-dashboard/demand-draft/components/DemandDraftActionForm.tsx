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
import { DemandDraftActionFormSchema, type DemandDraftActionFormValues } from '../helpers/demandDraftActionForm.schema';
import { useUpdateDemandDraftAction } from '@/hooks/api/useDemandDrafts';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form (DD) 1 - Request to Bank' },
    { value: 'accounts-form-2', label: 'Accounts Form (DD) 2 - After DD Creation' },
    { value: 'accounts-form-3', label: 'Accounts Form (DD) 3 - Capture DD Details' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'request-extension', label: 'Request Extension' },
    { value: 'returned-courier', label: 'Returned via Courier' },
    { value: 'request-cancellation', label: 'Request Cancellation' },
];

interface DemandDraftActionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    instrumentId: number;
    instrumentData?: {
        ddNo?: string;
        ddDate?: Date;
        amount?: number;
        tenderName?: string;
        tenderNo?: string;
    };
}

export function DemandDraftActionForm({
    open,
    onOpenChange,
    instrumentId,
    instrumentData,
}: DemandDraftActionFormProps) {
    const updateMutation = useUpdateDemandDraftAction();
    const [fileUploads, setFileUploads] = useState<Record<string, File[]>>({});

    const form = useForm<DemandDraftActionFormValues>({
        resolver: zodResolver(DemandDraftActionFormSchema) as Resolver<DemandDraftActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const ddReq = useWatch({ control: form.control, name: 'dd_req' });
    const modificationRequired = useWatch({ control: form.control, name: 'modification_required' });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: DemandDraftActionFormValues) => {
        try {
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                if (key === 'contacts' || key.includes('_imran') || key.includes('prefilled') || key.includes('_slip') || key.includes('covering') || key.includes('proof_image')) {
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
            if (values.dd_format_imran && fileUploads.dd_format_imran) {
                allFiles.push(...fileUploads.dd_format_imran);
            }
            if (values.prefilled_signed_dd && fileUploads.prefilled_signed_dd) {
                allFiles.push(...fileUploads.prefilled_signed_dd);
            }
            if (values.request_letter_email && fileUploads.request_letter_email) {
                allFiles.push(...fileUploads.request_letter_email);
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
                    <DialogTitle>Demand Draft Action Form</DialogTitle>
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

                        {/* Accounts Form (DD) 1 */}
                        <ConditionalSection show={action === 'accounts-form-1'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (DD) 1 - Request to Bank</h4>

                                <FieldWrapper control={form.control} name="dd_req" label="DD Request">
                                    {(field) => (
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Accepted" id="dd_req_accepted" />
                                                <Label htmlFor="dd_req_accepted">Accepted</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Rejected" id="dd_req_rejected" />
                                                <Label htmlFor="dd_req_rejected">Rejected</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                </FieldWrapper>

                                {ddReq === 'Rejected' && (
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

                                <FieldWrapper control={form.control} name="dd_format_imran" label="DD Format (Upload by Imran)">
                                    {(field) => (
                                        <FileUploadField
                                            control={form.control}
                                            name="dd_format_imran"
                                            label=""
                                            allowMultiple={false}
                                            acceptedFileTypes={['application/pdf', 'image/*']}
                                            onChange={(files) => {
                                                setFileUploads((prev) => ({ ...prev, dd_format_imran: files }));
                                            }}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="prefilled_signed_dd" label="Prefilled Bank Formats">
                                    {(field) => (
                                        <FileUploadField
                                            control={form.control}
                                            name="prefilled_signed_dd"
                                            label=""
                                            allowMultiple={true}
                                            acceptedFileTypes={['application/pdf', 'image/*']}
                                            onChange={(files) => {
                                                setFileUploads((prev) => ({ ...prev, prefilled_signed_dd: files }));
                                            }}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Accounts Form (DD) 2 */}
                        <ConditionalSection show={action === 'accounts-form-2'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (DD) 2 - After DD Creation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_no" label="DD No.">
                                        {(field) => <Input {...field} placeholder="Enter DD number" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_date" label="DD Date">
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

                        {/* Accounts Form (DD) 3 */}
                        <ConditionalSection show={action === 'accounts-form-3'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (DD) 3 - Capture DD Details</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_amount" label="DD Amount">
                                        {(field) => <Input {...field} type="number" placeholder="Enter amount" />}
                                    </FieldWrapper>
                                </div>

                                <h5 className="font-medium text-sm mt-4">Charges</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_charges" label="DD Charges">
                                        {(field) => <Input {...field} type="number" placeholder="Enter charges" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="sfms_charges" label="SFMS Charges">
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

                        {/* Request Extension */}
                        <ConditionalSection show={action === 'request-extension'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Request Extension</h4>

                                <FieldWrapper control={form.control} name="modification_required" label="Modification Required">
                                    {(field) => (
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Yes" id="mod_yes" />
                                                <Label htmlFor="mod_yes">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="No" id="mod_no" />
                                                <Label htmlFor="mod_no">No</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="request_letter_email" label="Request Letter/Email">
                                    {(field) => (
                                        <FileUploadField
                                            control={form.control}
                                            name="request_letter_email"
                                            label=""
                                            allowMultiple={false}
                                            acceptedFileTypes={['application/pdf', 'image/*']}
                                            onChange={(files) => {
                                                setFileUploads((prev) => ({ ...prev, request_letter_email: files }));
                                            }}
                                        />
                                    )}
                                </FieldWrapper>

                                {modificationRequired === 'Yes' && (
                                    <div className="space-y-2">
                                        <Label>Modification Fields</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Modification fields table can be added here
                                        </p>
                                    </div>
                                )}
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

                        {/* DD Cancellation Confirmation */}
                        <ConditionalSection show={action === 'dd-cancellation-confirmation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">DD Cancellation Confirmation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_cancellation_date" label="Date">
                                        {(field) => (
                                            <DatePicker
                                                date={field.value ? new Date(field.value) : undefined}
                                                onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_cancellation_amount" label="Amount">
                                        {(field) => <Input {...field} type="number" placeholder="Enter amount" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_cancellation_reference_no" label="Reference No.">
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
