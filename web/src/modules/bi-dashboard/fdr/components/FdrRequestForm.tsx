import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check, ChevronDown, Save } from 'lucide-react';
import { useCreatePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { useProjectList, useProjectOverview } from '@/hooks/api/useProjectDashboard';
import { useTenders } from '@/hooks/api/useTenders';
import { fdrsKey } from '@/hooks/api/useFdrs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DateInput from '@/components/form/DateInput';
import FieldWrapper from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type SelectOption } from '@/components/form/SelectField';
import { FdrForm } from '@/modules/tendering/emds-tenderfees/components/FdrForm';
import { PROJECT_FDR_PURPOSE_OPTIONS } from '@/modules/tendering/emds-tenderfees/constants';
import {
    ProjectFdrRequestSchema,
    type ProjectFdrRequestFormValues,
} from '@/modules/tendering/emds-tenderfees/helpers/payment-request.schema';

type FormValues = ProjectFdrRequestFormValues;

const FDR_PREFIX = 'EMD.details';

/** The tender or project this request is being raised against. */
type FdrContext =
    | { kind: 'tender'; id: number; tenderName: string; tenderNo: string; dueDate: string }
    | { kind: 'project'; id: number };

const toDateOnly = (value: string | null | undefined): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).split('T')[0] ?? '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

const formatDateForLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN');
};

/**
 * Combined tender + project picker. Selection is optional; clearing it raises
 * the request without a tender or project.
 */
function TenderProjectSelector({
    value,
    onSelect,
    onClear,
}: {
    value: string;
    onSelect: (context: FdrContext) => void;
    onClear: () => void;
}) {
    const { data: tenderList } = useTenders(undefined, undefined, { page: 1, limit: 200 });
    const { data: projectList } = useProjectList({ page: 1, limit: 200 });

    const { options, byKey } = useMemo(() => {
        const byKey = new Map<string, FdrContext>();
        const options: SelectOption[] = [];

        for (const tender of tenderList?.data ?? []) {
            const key = `tender:${tender.id}`;
            const dueDateLabel = formatDateForLabel(tender.dueDate ? String(tender.dueDate) : '');
            byKey.set(key, {
                kind: 'tender',
                id: tender.id,
                tenderName: tender.tenderName ?? '',
                tenderNo: tender.tenderNo ?? '',
                dueDate: tender.dueDate ? String(tender.dueDate) : '',
            });
            options.push({
                id: key,
                name: tender.tenderName || tender.tenderNo,
                description: `Tender · ${tender.tenderNo}${dueDateLabel ? ` · due ${dueDateLabel}` : ''}`,
            });
        }

        for (const project of projectList?.data ?? []) {
            const key = `project:${project.id}`;
            byKey.set(key, { kind: 'project', id: project.id });
            options.push({
                id: key,
                name: project.projectName || project.poNo || `Project #${project.id}`,
                description: `Project${project.poNo ? ` · WO ${project.poNo}` : ''}`,
            });
        }

        return { options, byKey };
    }, [tenderList, projectList]);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = options.find(option => option.id === value);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(option =>
            option.name.toLowerCase().includes(q) || (option.description ?? '').toLowerCase().includes(q),
        );
    }, [options, query]);

    return (
        <DropdownMenu
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setQuery('');
            }}
        >
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between min-w-0">
                    <span className="truncate">{selected ? selected.name : 'Select Tender / Project'}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96 max-w-[90vw] p-0" align="start">
                <div className="p-2 border-b">
                    <Input
                        autoFocus
                        placeholder="Search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-8"
                    />
                </div>
                <div className="max-h-64 overflow-auto py-1">
                    {filtered.length === 0 && (
                        <div className="px-2 py-2 text-sm text-muted-foreground">No results</div>
                    )}
                    {filtered.map((option) => {
                        const isSelected = option.id === value;
                        return (
                            <DropdownMenuItem
                                key={option.id}
                                onClick={() => {
                                    if (isSelected) {
                                        // Clicking the current choice clears it (selection is optional).
                                        onClear();
                                    } else {
                                        const context = byKey.get(option.id);
                                        if (context) onSelect(context);
                                    }
                                    setOpen(false);
                                    setQuery('');
                                }}
                                className="flex items-center justify-between gap-2"
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <Check className={`mr-1 h-4 w-4 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                    <span className="flex-1 min-w-0 truncate">{option.name}</span>
                                </div>
                                {option.description && (
                                    <span className="shrink-0 max-w-[45%] truncate text-xs text-muted-foreground">
                                        {option.description}
                                    </span>
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function FdrRequestForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const createRequest = useCreatePaymentRequest();

    const [selection, setSelection] = useState<FdrContext | null>(null);
    const selectedProjectId = selection?.kind === 'project' ? selection.id : 0;

    const { data: overview } = useProjectOverview(selectedProjectId);
    const projectName = overview?.project?.projectName ?? '';
    const poNo = overview?.project?.poNo ?? '';

    const form = useForm<FormValues>({
        resolver: zodResolver(ProjectFdrRequestSchema) as Resolver<FormValues>,
        defaultValues: {
            tenderName: '',
            tenderNo: '',
            EMD: { mode: 'FDR', details: {} },
        },
    });

    // Prefill the name/number/due-date fields from the selected tender or project.
    useEffect(() => {
        if (!selection) return;
        if (selection.kind === 'tender') {
            form.setValue('tenderName', selection.tenderName);
            form.setValue('tenderNo', selection.tenderNo);
            form.setValue('tenderDueDate', toDateOnly(selection.dueDate));
            return;
        }
        // Project: wait for its overview.
        if (!projectName && !poNo) return;
        form.setValue('tenderName', projectName);
        form.setValue('tenderNo', poNo);
        form.setValue('tenderDueDate', '');
    }, [selection, projectName, poNo, form]);

    const handleSubmit = async (values: FormValues) => {
        const selectedTender = selection?.kind === 'tender' ? selection : null;
        const selectedProject = selection?.kind === 'project' ? selection : null;

        const payload: any = {
            type: 'Other Than Tender',
            tenderNo: selectedTender ? selectedTender.tenderNo : (poNo || values.tenderNo || ''),
            tenderName: selectedTender ? selectedTender.tenderName : (projectName || values.tenderName || ''),
            dueDate: values.tenderDueDate || (selectedTender ? toDateOnly(selectedTender.dueDate) : ''),
            ...(selectedProject ? { projectId: selectedProject.id } : {}),
            // Keep the exact purpose chosen here on the request, regardless of
            // whether a tender, a project, or nothing is selected.
            preserveFdrPurpose: true,
            EMD: {
                mode: 'FDR',
                details: values.EMD?.details || {},
            },
        };

        try {
            await createRequest.mutateAsync({
                tenderId: selectedTender ? selectedTender.id : 0,
                data: payload,
            });
            queryClient.invalidateQueries({ queryKey: fdrsKey.all });
            toast.success('FDR request created successfully');
            navigate(-1);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Request Fixed Deposit Receipt (FDR)</CardTitle>
                <CardDescription>
                    <p className="text-muted-foreground">
                        Raise an FDR request against a tender or a project. It follows the same approval flow as an EMD FDR.
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
                        onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                            console.error('Form validation errors:', errors);
                            toast.error('Please fix the errors in the form before submitting');
                        })}
                        className="space-y-8"
                    >
                        <div className="space-y-2 max-w-sm">
                            <label className="text-sm font-medium">Tender / Project</label>
                            <TenderProjectSelector
                                value={selection ? `${selection.kind}:${selection.id}` : ''}
                                onSelect={setSelection}
                                onClear={() => {
                                    setSelection(null);
                                    form.setValue('tenderName', '');
                                    form.setValue('tenderNo', '');
                                    form.setValue('tenderDueDate', '');
                                }}
                            />
                            <p className="text-xs text-muted-foreground">
                                Optional — pick a tender or project, or leave blank to raise the request without one.
                            </p>
                        </div>

                        {selection && (
                            <div className={`grid grid-cols-1 md:grid-cols-2 ${selection.kind === 'tender' ? 'lg:grid-cols-3' : ''} gap-4 items-start mb-4`}>
                                <FieldWrapper
                                    control={form.control}
                                    name="tenderName"
                                    label={selection.kind === 'tender' ? 'Tender Name' : 'Project Name'}
                                >
                                    {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                                </FieldWrapper>
                                <FieldWrapper
                                    control={form.control}
                                    name="tenderNo"
                                    label={selection.kind === 'tender' ? 'Tender No.' : 'Work No.'}
                                >
                                    {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                                </FieldWrapper>
                                {selection.kind === 'tender' && (
                                    <FieldWrapper control={form.control} name="tenderDueDate" label="Due Date">
                                        {(field) => (
                                            <DateInput
                                                value={field.value || null}
                                                onChange={field.onChange}
                                                disabled
                                                className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed"
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>
                        )}

                        <div className="border rounded-lg p-6 bg-muted/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">FDR Details</h3>
                            </div>

                            <FdrForm
                                prefix={FDR_PREFIX}
                                purposeOptions={PROJECT_FDR_PURPOSE_OPTIONS}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate(-1)}
                                disabled={createRequest.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={createRequest.isPending}
                                className="min-w-48"
                            >
                                {createRequest.isPending ? (
                                    'Submitting...'
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        Submit Request
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

export default FdrRequestForm;
