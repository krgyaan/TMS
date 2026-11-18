import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DateInput from '@/components/form/DateInput';
import FieldWrapper from '@/components/form/FieldWrapper';
import { NumberInput } from '@/components/form/NumberInput';
import { SelectField } from '@/components/form/SelectField';
import { FileUploader } from '@/components/file-upload';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BANKS } from '@/modules/tendering/emds-tenderfees/constants';
import { useProjectOverview } from '@/hooks/api/useProjectDashboard';
import { useCourierSelectOptions } from '@/hooks/api/useCourier';
import { useCreateBankGuaranteeOldBg } from '@/hooks/api/useBankGuarantees';
import { paths } from '@/app/routes/paths';
import { toast } from 'sonner';
import { ArrowLeft, Check, ChevronDown, Loader2, Save } from 'lucide-react';
import { TenderProjectSelector, type BgContext } from './BankGuaranteeRequestForm';
import {
    BankGuaranteeOldEntrySchema,
    type BankGuaranteeOldEntryFormValues,
} from '../helpers/bankGuaranteeOldEntry.schema';

type FormValues = BankGuaranteeOldEntryFormValues;

const OLD_BG_PURPOSE_OPTIONS = [
    { value: 'ADVANCE_PAYMENT', label: 'Advance Payment' },
    { value: 'SECURITY_BOND_DEPOSIT', label: 'Security Bond/Deposit' },
    { value: 'PERFORMANCE_BG', label: 'Performance BG' },
    { value: 'SECURITY_DEPOSIT', label: 'Security Deposit' },
    { value: 'FINANCIAL', label: 'Financial' },
    { value: 'COUNTER_GUARANTEE', label: 'Counter Guarantee' },
];

function CourierSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const { options, onSearch } = useCourierSelectOptions(value);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = options.find((option) => option.id === value);

    return (
        <DropdownMenu
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setQuery('');
                    onSearch('');
                }
            }}
        >
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between min-w-0">
                    <span className="truncate">{selected ? selected.name : 'Select Courier (optional)'}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96 max-w-[90vw] p-0" align="start">
                <div className="p-2 border-b">
                    <Input
                        autoFocus
                        placeholder="Search courier..."
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            onSearch(event.target.value);
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="h-8"
                    />
                </div>
                <div className="max-h-64 overflow-auto py-1">
                    {options.length === 0 && (
                        <div className="px-2 py-2 text-sm text-muted-foreground">No couriers found</div>
                    )}
                    {options.map((option) => (
                        <DropdownMenuItem
                            key={option.id}
                            onClick={() => {
                                onChange(option.id === value ? '' : option.id);
                                setOpen(false);
                                setQuery('');
                                onSearch('');
                            }}
                            className="flex items-center gap-2"
                        >
                            <Check className={`mr-1 h-4 w-4 shrink-0 ${option.id === value ? 'opacity-100' : 'opacity-0'}`} />
                            <span className="flex-1 min-w-0 truncate">{option.name}</span>
                        </DropdownMenuItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function BankGuaranteeOldEntryForm() {
    const navigate = useNavigate();
    const createOldBg = useCreateBankGuaranteeOldBg();

    const [selection, setSelection] = useState<BgContext | null>(null);
    const [manualReference, setManualReference] = useState('');

    const selectedProjectId = selection?.kind === 'project' ? selection.id : 0;
    const { data: overview } = useProjectOverview(selectedProjectId);
    const projectName = overview?.project?.projectName ?? '';
    const poNo = overview?.project?.poNo ?? '';

    const form = useForm<FormValues>({
        resolver: zodResolver(BankGuaranteeOldEntrySchema) as Resolver<FormValues>,
        defaultValues: {
            purpose: '',
            bgFavour: '',
            bgAddress: '',
            bgExpiryDate: '',
            bgClaimPeriod: '',
            amount: undefined as unknown as number,
            stampValue: undefined,
            bgPoFiles: [],
            clientUserEmail: '',
            clientCpEmail: '',
            clientFinanceEmail: '',
            accountName: '',
            accountNo: '',
            ifsc: '',
            bankName: '',
            bgNo: '',
            bgDate: '',
            remarks: '',
            fdrPer: undefined,
            fdrAmt: undefined,
            fdrNo: '',
            fdrValidity: '',
            fdrRoi: undefined,
            bgChargeDeducted: undefined,
            sfmsChargeDeducted: undefined,
            stampChargeDeducted: undefined,
            otherChargeDeducted: undefined,
            courierId: '',
            bgUpload: [],
            sfmsConf: [],
            fdrCopy: [],
        },
    });

    const bgPoFiles = useWatch({ control: form.control, name: 'bgPoFiles' });
    const bgUpload = useWatch({ control: form.control, name: 'bgUpload' });
    const sfmsConf = useWatch({ control: form.control, name: 'sfmsConf' });
    const fdrCopy = useWatch({ control: form.control, name: 'fdrCopy' });
    const courierId = useWatch({ control: form.control, name: 'courierId' });

    const handleSubmit = async (values: FormValues) => {
        const manual = manualReference.trim();
        const reference = manual
            ? {
                tenderId: 0,
                projectId: undefined,
                tenderNo: manual,
                projectName: selection?.kind === 'project' ? projectName || undefined : selection?.kind === 'tender' ? selection.tenderName : undefined,
            }
            : selection?.kind === 'tender'
                ? {
                    tenderId: selection.id,
                    projectId: undefined,
                    tenderNo: selection.tenderNo,
                    projectName: selection.tenderName,
                }
                : selection?.kind === 'project'
                    ? {
                        tenderId: 0,
                        projectId: selection.id,
                        tenderNo: poNo || '',
                        projectName: projectName || undefined,
                    }
                    : { tenderId: 0, projectId: undefined, tenderNo: '', projectName: undefined };

        try {
            await createOldBg.mutateAsync({
                ...reference,
                purpose: values.purpose,
                bgFavour: values.bgFavour,
                bgAddress: values.bgAddress,
                bgExpiryDate: values.bgExpiryDate,
                bgClaimPeriod: values.bgClaimPeriod,
                amount: values.amount,
                stampValue: values.stampValue,
                bgPoFiles: values.bgPoFiles ?? [],
                clientUserEmail: values.clientUserEmail,
                clientCpEmail: values.clientCpEmail,
                clientFinanceEmail: values.clientFinanceEmail,
                accountName: values.accountName,
                accountNo: values.accountNo,
                ifsc: values.ifsc,
                bankName: values.bankName,
                bgNo: values.bgNo,
                bgDate: values.bgDate,
                remarks: values.remarks,
                fdrPer: values.fdrPer,
                fdrAmt: values.fdrAmt,
                fdrNo: values.fdrNo,
                fdrValidity: values.fdrValidity,
                fdrRoi: values.fdrRoi,
                bgChargeDeducted: values.bgChargeDeducted,
                sfmsChargeDeducted: values.sfmsChargeDeducted,
                stampChargeDeducted: values.stampChargeDeducted,
                otherChargeDeducted: values.otherChargeDeducted,
                courierId: values.courierId || undefined,
                bgUpload: values.bgUpload ?? [],
                sfmsConf: values.sfmsConf ?? [],
                fdrCopy: values.fdrCopy ?? [],
            });

            toast.success('Old Bank Guarantee saved successfully');
            navigate(paths.bi.bankGuarantee);
        } catch (error) {
            console.error(error);
            toast.error('Could not save the old Bank Guarantee. Please try again.');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Add Old Bank Guarantee</CardTitle>
                <CardDescription>
                    <p className="text-muted-foreground">
                        Record an already-issued Bank Guarantee so it is tracked as a live BG.
                    </p>
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Back</span>
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <FormProvider {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit, () => {
                            toast.error('Please fix the errors in the form before submitting');
                        })}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Reference</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tender / Project</label>
                                    <TenderProjectSelector
                                        value={selection ? `${selection.kind}:${selection.id}` : ''}
                                        onSelect={(context) => setSelection(context)}
                                        onClear={() => setSelection(null)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Or enter Tender No. / WO No.</label>
                                    <Input
                                        value={manualReference}
                                        onChange={(event) => setManualReference(event.target.value)}
                                        placeholder="e.g. GEMC-511687785178741"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Optional — pick a tender or project, or type the reference manually. A manual entry takes priority.
                            </p>
                        </div>

                        <div className="border rounded-lg p-6 bg-muted/20 space-y-4">
                            <h3 className="text-lg font-semibold">Bank Guarantee Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                <SelectField
                                    control={form.control}
                                    name="purpose"
                                    label="Purpose *"
                                    options={OLD_BG_PURPOSE_OPTIONS}
                                    placeholder="Select Purpose"
                                />
                                <FieldWrapper control={form.control} name="bgFavour" label="BG in Favour of *">
                                    {(field) => <Input {...field} placeholder="e.g. Individual or Company Name" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="bgAddress" label="BG Address *">
                                    {(field) => <Textarea rows={2} {...field} placeholder="Client address to be written in the BG" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="bgExpiryDate" label="BG Expiry Date *">
                                    {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="bgClaimPeriod" label="BG Claim Period *">
                                    {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="amount" label="BG Amount *">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="stampValue" label="BG Stamp Paper Value">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="bgNo" label="BG No. *">
                                    {(field) => <Input {...field} placeholder="Enter BG number" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="bgDate" label="BG Creation Date *">
                                    {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                </FieldWrapper>
                                <SelectField
                                    control={form.control}
                                    name="bankName"
                                    label="Bank Name *"
                                    options={BANKS}
                                    placeholder="Select Bank"
                                />
                                <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                    {(field) => <Input {...field} placeholder="Any remark" />}
                                </FieldWrapper>
                                
                            </div>

                            <h3 className="text-lg font-semibold pt-2">Client &amp; Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={form.control} name="clientUserEmail" label="Client Mail Id (User)">
                                    {(field) => <Input {...field} placeholder="user@client.com" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="clientCpEmail" label="Client Mail Id (C&P)">
                                    {(field) => <Input {...field} placeholder="cp@client.com" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="clientFinanceEmail" label="Client Mail Id (Finance)">
                                    {(field) => <Input {...field} placeholder="finance@client.com" />}
                                </FieldWrapper>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={form.control} name="accountName" label="Client Account Name">
                                    {(field) => <Input {...field} placeholder="Account holder name" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="accountNo" label="Client Account No.">
                                    {(field) => <Input {...field} placeholder="Account number" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="ifsc" label="IFSC">
                                    {(field) => <Input {...field} placeholder="IFSC code" />}
                                </FieldWrapper>
                            </div>

                            <h3 className="text-lg font-semibold pt-2">FDR Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={form.control} name="fdrPer" label="FDR %age">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="fdrAmt" label="FDR Amount">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="fdrNo" label="FDR No.">
                                    {(field) => <Input {...field} placeholder="FDR number" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="fdrValidity" label="FDR Validity">
                                    {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="fdrRoi" label="FDR ROI %">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                            </div>

                            <h3 className="text-lg font-semibold pt-2">Charges</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FieldWrapper control={form.control} name="bgChargeDeducted" label="BG Charges Deducted">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="sfmsChargeDeducted" label="SFMS Charges Deducted">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="stampChargeDeducted" label="Stamp Paper Charges Deducted">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="otherChargeDeducted" label="Other Charges Deducted">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                            </div>

                            <h3 className="text-lg font-semibold pt-2">Courier &amp; Uploads</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Courier No. (optional)</label>
                                    <CourierSelector
                                        value={courierId ?? ''}
                                        onChange={(value) => form.setValue('courierId', value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FileUploader
                                    context="bg-po-files"
                                    label="PO/Tender/Request Letter (optional)"
                                    value={bgPoFiles ?? []}
                                    onChange={(paths) => form.setValue('bgPoFiles', paths)}
                                />
                                <FileUploader
                                    context="bg-upload"
                                    label="Soft Copy of BG"
                                    value={bgUpload ?? []}
                                    onChange={(paths) => form.setValue('bgUpload', paths)}
                                />
                                <FileUploader
                                    context="bg-sfms-conf"
                                    label="SFMS Copy"
                                    value={sfmsConf ?? []}
                                    onChange={(paths) => form.setValue('sfmsConf', paths)}
                                />
                                <FileUploader
                                    context="bg-fdr-copy"
                                    label="FDR Copy"
                                    value={fdrCopy ?? []}
                                    onChange={(paths) => form.setValue('fdrCopy', paths)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate(-1)}
                                disabled={createOldBg.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" size="lg" disabled={createOldBg.isPending} className="min-w-48">
                                {createOldBg.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        Save Old BG
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    );
}

export default BankGuaranteeOldEntryForm;
