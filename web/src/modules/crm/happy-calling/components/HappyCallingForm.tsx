import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Loader2, Save, PhoneCall, Pencil, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DateInput from '@/components/form/DateInput';
import { BroadcastSelect } from '@/modules/crm/happy-calling/components/BroadcastSelect';
import { useCreateHappyCalling, useUpdateHappyCalling } from '@/hooks/api/useHappyCalling';
import { toast } from 'sonner';
import { paths } from '@/app/routes/paths';
import type { ClientDirectoryRow } from '@/modules/shared/client-directory/helpers/client-directory.types';
import type { HappyCallingStatus, HappyCallingRow } from '@/modules/crm/happy-calling/helpers/happy-calling.types';

const formSchema = z.object({
    organization: z.string().max(255).optional().or(z.literal('')),
    name: z.string().min(1, 'Name is required').max(255),
    designation: z.string().max(255).optional().or(z.literal('')),
    email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
    phone: z.string().max(20).optional().or(z.literal('')),
    date: z.string().optional().or(z.literal('')),
    status: z.string().max(50).optional().or(z.literal('')),
    nextFollowupDate: z.string().optional().or(z.literal('')),
    broadcast: z.number().optional(),
    details: z.string().max(5000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

const inputCls =
    'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent ' +
    'px-3 py-1 text-sm outline-none focus-visible:border-ring ' +
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]';

type Props =
    | {
          mode: 'create';
          client: ClientDirectoryRow;
          onBack?: () => void;
      }
    | {
          mode: 'edit';
          record: HappyCallingRow;
          onBack: () => void;
          onSaved: () => void;
      };

export function HappyCallingForm(props: Props) {
    const navigate = useNavigate();
    const createMutation = useCreateHappyCalling();
    const updateMutation = useUpdateHappyCalling();

    const isEdit = props.mode === 'edit';
    const client = isEdit ? null : props.client;
    const record = isEdit ? props.record : null;

    const toInput = (v?: string | null) => {
        if (!v) return '';
        const s = String(v);
        return s.includes('T') ? s.slice(0, 16) : s;
    };

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: isEdit
            ? {
                  organization: record?.organization ?? '',
                  name: record?.name ?? '',
                  designation: record?.designation ?? '',
                  email: record?.email ?? '',
                  phone: record?.phone ?? '',
                  date: toInput(record?.date),
                  status: (record?.status as HappyCallingStatus | null) ?? '',
                  nextFollowupDate: toInput(record?.nextFollowupDate),
                  broadcast: record?.broadcast ?? 0,
                  details: record?.details ?? '',
              }
            : {
                  organization: client?.organization ?? '',
                  name: client?.name ?? '',
                  designation: client?.designation ?? '',
                  email: client?.email ?? '',
                  phone: client?.phone ?? '',
                  date: '',
                  status: 'call',
                  nextFollowupDate: '',
                  broadcast: 0,
                  details: '',
              },
    });

    useEffect(() => {
        if (props.mode === 'edit') {
            form.reset({
                organization: props.record.organization ?? '',
                name: props.record.name,
                designation: props.record.designation ?? '',
                email: props.record.email ?? '',
                phone: props.record.phone ?? '',
                date: toInput(props.record.date),
                status: (props.record.status as HappyCallingStatus | null) ?? '',
                nextFollowupDate: toInput(props.record.nextFollowupDate),
                broadcast: props.record.broadcast ?? 0,
                details: props.record.details ?? '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.mode]);

    const saving = isEdit ? updateMutation.isPending : createMutation.isPending;

    const backToList = () => {
        if (isEdit) props.onBack();
        else if (props.onBack) props.onBack();
        else navigate(paths.crm.happyCalling);
    };

    const handleSubmit = async (values: FormValues) => {
        if (isEdit) {
            await updateMutation.mutateAsync({
                id: props.record.id,
                data: {
                    organization: values.organization || null,
                    name: values.name,
                    designation: values.designation || null,
                    email: values.email || null,
                    phone: values.phone || null,
                    date: values.date || null,
                    status: (values.status || null) as HappyCallingStatus | null,
                    nextFollowupDate: values.nextFollowupDate || null,
                    broadcast: values.broadcast ?? 0,
                    details: values.details || null,
                },
            });
            toast.success('Happy calling entry updated');
            props.onSaved();
        } else {
            await createMutation.mutateAsync({
                cDId: props.client.id,
                organization: props.client.organization ?? null,
                name: props.client.name,
                designation: props.client.designation ?? null,
                email: props.client.email ?? null,
                phone: props.client.phone ?? null,
                date: values.date || null,
                status: 'call',
                nextFollowupDate: values.nextFollowupDate || null,
                broadcast: values.broadcast ?? 0,
                details: values.details || null,
            });
            toast.success('Happy calling entry created');
            navigate(paths.crm.happyCalling);
        }
    };

    return (
        <>
            <div className="mb-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            isEdit
                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}
                    >
                        {isEdit ? <Pencil className="h-5 w-5" /> : <PhoneCall className="h-5 w-5" />}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">
                            {isEdit ? 'Edit Happy Calling' : 'Happy Calling'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {isEdit
                                ? 'Update the details for this entry'
                                : `Record a call and follow-up details for ${props.client.name}`}
                        </p>
                    </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={backToList}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                <div className="rounded-lg border bg-muted/30 p-4">
                    <h3 className="text-sm font-medium mb-3">Client Information</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Organization</Label>
                            <Input
                                className={inputCls}
                                readOnly={!isEdit}
                                {...form.register('organization')}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Name *</Label>
                            <Input className={inputCls} readOnly={!isEdit} {...form.register('name')} />
                            {form.formState.errors.name && (
                                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Designation</Label>
                            <Input className={inputCls} readOnly={!isEdit} {...form.register('designation')} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Email</Label>
                            <Input
                                type="email"
                                className={inputCls}
                                readOnly={!isEdit}
                                {...form.register('email')}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Phone</Label>
                            <Input className={inputCls} readOnly={!isEdit} {...form.register('phone')} />
                        </div>
                        {isEdit && (
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs">Status</Label>
                                <Input
                                    className={inputCls}
                                    placeholder="Call"
                                    {...form.register('status')}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="date">{isEdit ? 'Date' : 'Call Date/Time'}</Label>
                        <Input id="date" type="datetime-local" className={inputCls} {...form.register('date')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nextFollowupDate">Next Follow Up Date</Label>
                        <DateInput
                            id="nextFollowupDate"
                            value={form.watch('nextFollowupDate') || ''}
                            onChange={(value) => form.setValue('nextFollowupDate', value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Add to Broadcast List</Label>
                        <BroadcastSelect
                            value={form.watch('broadcast')}
                            onChange={(id) => form.setValue('broadcast', id)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="details">{isEdit ? 'Details' : 'Point Discussed'}</Label>
                    <Textarea
                        id="details"
                        rows={4}
                        placeholder="Describe what was discussed during the call..."
                        {...form.register('details')}
                    />
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button type="button" variant="outline" onClick={backToList} disabled={saving}>
                        {isEdit ? 'Cancel' : 'Back'}
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                    </Button>
                </div>
            </form>
        </>
    );
}

export default HappyCallingForm;
