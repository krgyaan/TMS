import { useWatch, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CompactFileUploader, FileUploader } from '@/components/file-upload';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

const FDR_PERCENTAGE_OPTIONS = [
    { value: '10', label: '10%' },
    { value: '15', label: '15%' },
    { value: '100', label: '100%' },
];

const APPROVE_BG_OPTIONS = [
    { value: 'Accept the BG given by TE', label: 'Accept the BG given by TE' },
    { value: 'Upload by Imran', label: 'Upload by Imran' },
];

export interface MailIdsArray {
    fields: Array<{ id: string }>;
    append: (value: { email?: string }) => void;
    remove: (index: number) => void;
}

export interface AccountsForm1Names<T extends FieldValues> {
    bgReq: FieldPath<T>;
    reasonReq: FieldPath<T>;
    approveBg: FieldPath<T>;
    prefilledSignedBg: FieldPath<T>;
    bankMailIds: FieldPath<T>;
    bankMailIdsCc: FieldPath<T>;
    bgApprovedFdrPer?: FieldPath<T>;
    bgFormatImran?: FieldPath<T>;
}

interface BankMailIdsFieldsProps<T extends FieldValues> {
    control: Control<T>;
    path: FieldPath<T>;
    rows: MailIdsArray;
    heading: string;
    placeholder: string;
    emptyText: string;
    removeLabel: string;
}

function BankMailIdsFields<T extends FieldValues>({
    control,
    path,
    rows,
    heading,
    placeholder,
    emptyText,
    removeLabel,
}: BankMailIdsFieldsProps<T>) {
    return (
        <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-semibold text-base text-primary">{heading}</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => rows.append({ email: '' })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                </Button>
            </div>
            {rows.fields.length === 0 && (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
            )}
            <div className="flex flex-wrap items-end gap-2">
                {rows.fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-1 w-full sm:w-72">
                        <FieldWrapper
                            control={control}
                            name={`${path}.${index}.email` as FieldPath<T>}
                            label=""
                        >
                            {(f) => (
                                <Input
                                    {...f}
                                    value={(f.value as string | undefined) ?? ''}
                                    type="email"
                                    placeholder={placeholder}
                                />
                            )}
                        </FieldWrapper>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => rows.remove(index)}
                            className="text-destructive hover:text-destructive shrink-0"
                            aria-label={removeLabel}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface AccountsForm1FieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: AccountsForm1Names<T>;
    bankMailIds: MailIdsArray;
    bankMailIdsCc: MailIdsArray;
    disabled?: boolean;
    prefilledMode?: 'array' | 'single';
    fdrValueType?: 'auto' | 'string' | 'number';
}

export function AccountsForm1Fields<T extends FieldValues>({
    control,
    names,
    bankMailIds,
    bankMailIdsCc,
    disabled,
    prefilledMode = 'array',
    fdrValueType = 'auto',
}: AccountsForm1FieldsProps<T>) {
    const bgReq = useWatch({ control, name: names.bgReq });
    const approveBg = useWatch({ control, name: names.approveBg });

    return (
        <>
            <FieldWrapper control={control} name={names.bgReq} label="BG Request">
                {(field) => (
                    <RadioGroup
                        value={field.value as string | undefined}
                        onValueChange={field.onChange}
                        className="flex gap-6"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Accepted" id="bg_req_accepted" />
                            <Label htmlFor="bg_req_accepted">Accepted</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Rejected" id="bg_req_rejected" />
                            <Label htmlFor="bg_req_rejected">Rejected</Label>
                        </div>
                    </RadioGroup>
                )}
            </FieldWrapper>

            {bgReq === 'Accepted' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start pt-3">
                    {names.bgApprovedFdrPer && (
                        <SelectField
                            label="FDR %"
                            control={control}
                            name={names.bgApprovedFdrPer}
                            options={FDR_PERCENTAGE_OPTIONS}
                            placeholder="Select percentage"
                            valueType={fdrValueType}
                        />
                    )}
                    <SelectField
                        label="Approved BG Format"
                        control={control}
                        name={names.approveBg}
                        options={APPROVE_BG_OPTIONS}
                        placeholder="Select an option"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start pt-3">
                {bgReq === 'Rejected' && (
                    <FieldWrapper
                        control={control}
                        name={names.reasonReq}
                        label="Reason for Rejection *"
                        className="md:col-span-2"
                    >
                        {(field) => (
                            <Textarea
                                {...field}
                                value={(field.value as string | undefined) ?? ''}
                                placeholder="Enter reason for rejection"
                                className="min-h-[80px]"
                            />
                        )}
                    </FieldWrapper>
                )}
                {bgReq === 'Accepted' && (
                    <FieldWrapper control={control} name={names.prefilledSignedBg} label="Prefilled Bank Formats">
                        {(field) =>
                            prefilledMode === 'single' ? (
                                <CompactFileUploader
                                    context="bg-prefilled-signed"
                                    value={field.value as string | undefined}
                                    onChange={field.onChange}
                                    disabled={disabled}
                                />
                            ) : (
                                <FileUploader
                                    context="bg-prefilled-signed"
                                    value={(field.value as string[] | undefined) ?? []}
                                    onChange={field.onChange}
                                    disabled={disabled}
                                />
                            )
                        }
                    </FieldWrapper>
                )}
                {approveBg === 'Upload by Imran' && names.bgFormatImran && (
                    <FieldWrapper control={control} name={names.bgFormatImran} label="Upload Documents *">
                        {(field) => (
                            <FileUploader
                                context="bg-format-imran"
                                value={(field.value as string[] | undefined) ?? []}
                                onChange={field.onChange}
                                disabled={disabled}
                            />
                        )}
                    </FieldWrapper>
                )}
            </div>

            <BankMailIdsFields<T>
                control={control}
                path={names.bankMailIds}
                rows={bankMailIds}
                heading="Bank Mail Ids"
                placeholder="e.g., bank.manager@bank.com"
                emptyText="No mail ids added. Click &quot;Add&quot; to add one."
                removeLabel="Remove mail id"
            />

            <BankMailIdsFields<T>
                control={control}
                path={names.bankMailIdsCc}
                rows={bankMailIdsCc}
                heading="Bank Mail Ids CC"
                placeholder="e.g., branch@bank.com"
                emptyText="No CC mail ids added. Click &quot;Add&quot; to add one."
                removeLabel="Remove CC mail id"
            />
        </>
    );
}
