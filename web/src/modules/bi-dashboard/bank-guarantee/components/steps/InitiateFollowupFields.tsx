import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUploader } from '@/components/file-upload';
import { parseFileMeta } from '@/components/file-upload/helpers/fileMeta';
import { fileUploadService } from '@/services/api/file-upload.service';
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FREQUENCY_LABELS } from '@/components/form/FollowUpFrequencySelect';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { StopReasonFields, STOP_REASON_LABELS } from '@/components/form/StopReasonFields';
import DateInput from '@/components/form/DateInput';

const ReadOnlyValue = ({ label, value, type }: {
    label: string;
    value?: string | number | null;
    type?: 'text' | 'number' | 'date';
}) => (
    <div className="grid gap-2">
        <Label className="inline-flex items-center flex-wrap">{label}</Label>
        <Input type={type ?? 'text'} value={value ?? ''} readOnly tabIndex={-1} className="bg-muted" />
    </div>
);

const toDateString = (v: unknown): string | undefined =>
    v ? new Date(v as string).toISOString().slice(0, 10) : undefined;

export interface FollowupViewData {
    organisationName?: string | null;
    followupStartDate?: string | null;
    frequency?: string | number | null;
    contacts?: Array<{ name?: string; phone?: string | null; email?: string | null }> | null;
    attachments?: string[] | null;
    stopReason?: string | number | null;
    proofText?: string | null;
    proofImagePath?: string | null;
    stopRemarks?: string | null;
}

export function FollowupReadOnlyView({ data }: { data: FollowupViewData }) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                <ReadOnlyValue label="Organisation Name" value={data.organisationName} />
                <ReadOnlyValue
                    label="Follow-up Start Date"
                    type="date"
                    value={toDateString(data.followupStartDate)}
                />
                <ReadOnlyValue
                    label="Follow-up Frequency"
                    value={FREQUENCY_LABELS[String(data.frequency)] ?? data.frequency ?? ''}
                />
            </div>

            <div className="grid gap-2">
                <Label className="inline-flex items-center flex-wrap">Contact Person(s)</Label>
                <div className="space-y-2">
                    {(data.contacts ?? []).length === 0 && (
                        <p className="text-sm text-muted-foreground">No contacts recorded.</p>
                    )}
                    {(data.contacts ?? []).map((contact, index) => (
                        <div key={index} className="rounded-md border bg-muted px-3 py-2 text-sm">
                            <span className="font-medium">{contact.name}</span>
                            {contact.phone ? (
                                <span className="text-muted-foreground"> · {contact.phone}</span>
                            ) : null}
                            {contact.email ? (
                                <span className="text-muted-foreground"> · {contact.email}</span>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            {(data.attachments ?? []).length > 0 && (
                <div className="grid gap-2">
                    <Label className="inline-flex items-center flex-wrap">Attachments</Label>
                    <div className="space-y-2">
                        {data.attachments!.map((path) => (
                            <div key={path} className="rounded-md border bg-muted px-3 py-2 text-sm">
                                <a
                                    href={fileUploadService.getFileUrl(path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    {parseFileMeta(path).displayName}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {Number(data.frequency) === 6 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start gap-y-4">
                    <ReadOnlyValue
                        label="Stop Reason"
                        value={STOP_REASON_LABELS[String(data.stopReason)] ?? ''}
                    />
                    {Number(data.stopReason) === 2 && (
                        <ReadOnlyValue label="Proof Details" value={data.proofText} />
                    )}
                    {Number(data.stopReason) === 2 && data.proofImagePath && (
                        <ReadOnlyValue label="Proof Image" value={data.proofImagePath} />
                    )}
                    {Number(data.stopReason) === 4 && (
                        <ReadOnlyValue label="Remarks" value={data.stopRemarks} />
                    )}
                </div>
            )}
        </>
    );
}

export interface InitiateFollowupNames<T extends FieldValues> {
    organisationName: FieldPath<T>;
    contacts: FieldPath<T>;
    followupStartDate: FieldPath<T>;
    frequency: FieldPath<T>;
    stopReason: FieldPath<T>;
    proofText: FieldPath<T>;
    stopRemarks: FieldPath<T>;
    proofImage: FieldPath<T>;
    attachments: FieldPath<T>;
}

interface InitiateFollowupFieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: InitiateFollowupNames<T>;
    disabled?: boolean;
}

export function InitiateFollowupFields<T extends FieldValues>({
    control,
    names,
    disabled,
}: InitiateFollowupFieldsProps<T>) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
            <FieldWrapper control={control} name={names.organisationName} label="Organisation Name">
                {(field) => (
                    <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder="Enter organisation name" />
                )}
            </FieldWrapper>
            <div className="col-span-3">
                <ContactPersonFields control={control} name={names.contacts} />
            </div>
            <FieldWrapper control={control} name={names.followupStartDate} label="Follow-up Start Date">
                {(field) => (
                    <DateInput
                        value={(field.value as string | undefined) ?? undefined}
                        onChange={field.onChange}
                    />
                )}
            </FieldWrapper>
            <FollowUpFrequencySelect control={control} name={names.frequency} />
            <div className="col-span-3">
                <StopReasonFields
                    control={control}
                    frequencyFieldName={names.frequency}
                    stopReasonFieldName={names.stopReason}
                    proofTextFieldName={names.proofText}
                    stopRemarksFieldName={names.stopRemarks}
                    proofImageFieldName={names.proofImage}
                />
            </div>
            <div className="col-span-3">
                <FieldWrapper control={control} name={names.attachments} label="Attachments">
                    {(field) => (
                        <FileUploader
                            context="follow-ups"
                            value={(field.value as string[] | undefined) ?? []}
                            onChange={field.onChange}
                            disabled={disabled}
                        />
                    )}
                </FieldWrapper>
            </div>
        </div>
    );
}
