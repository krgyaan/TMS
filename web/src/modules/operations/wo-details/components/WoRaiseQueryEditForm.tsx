import { useFieldArray, useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { Plus, Trash2, Save, AlertCircle, ArrowLeft, CheckCircle2, History, Edit2, X } from 'lucide-react';
import { usePotentialRecipients, useCreateBulkWoQueries, useRespondToQuery, useUpdateWoQuery, useDeleteWoQuery } from '@/hooks/api/useWoQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/api/useAuth';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WoQuery } from '@/modules/operations/types/wo.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import DateTimeInput from '@/components/form/DateTimeInput';
import { Label } from '@/components/ui/label';

const QueryItemSchema = z.object({
    queryTo: z.enum(['TE', 'OE', 'BOTH']),
    queryToUserIds: z.array(z.string()).min(1, 'Please select at least one recipient'),
    queryText: z.string().min(1, 'Query text is required'),
});

const RaiseQuerySchema = z.object({
    queries: z.array(QueryItemSchema),
});

type RaiseQueryValues = z.infer<typeof RaiseQuerySchema>;

const ResolveQuerySchema = z.object({
    responseText: z.string().min(1, 'Response text is required'),
    respondedBy: z.string().min(1, 'Responder is required'),
    respondedAt: z.string().min(1, 'Response date is required'),
});

type ResolveQueryValues = z.infer<typeof ResolveQuerySchema>;

interface WoRaiseQueryEditFormProps {
    woDetailsId: number;
    initialQueries: WoQuery[];
}

const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        responded: 'bg-blue-100 text-blue-800 border-blue-200',
        closed: 'bg-green-100 text-green-800 border-green-200',
        escalated: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
        <Badge variant="outline" className={cn("px-2 py-0.5 capitalize font-medium", variants[status] || 'bg-gray-100 text-gray-800')}>
            {status}
        </Badge>
    );
};

const ExistingQueryItem = ({
    query,
    onResolve,
    onUpdate,
    onDelete,
    isResponding,
    isUpdating,
    isDeleting,
    recipients
}: {
    query: WoQuery,
    onResolve: (id: number, values: ResolveQueryValues) => void,
    onUpdate: (id: number, text: string) => void,
    onDelete: (id: number) => void,
    isResponding: boolean,
    isUpdating: boolean,
    isDeleting: boolean,
    recipients: any
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(query.queryText);
    const isPending = query.status === 'pending';

    const resolveForm = useForm<ResolveQueryValues>({
        resolver: zodResolver(ResolveQuerySchema),
        defaultValues: {
            responseText: query.responseText || '',
            respondedBy: query.respondedBy ? String(query.respondedBy) : '',
            respondedAt: query.respondedAt || new Date().toISOString(),
        }
    });

    const getResponderOptions = () => {
        if (!recipients) return [];
        let options: { value: string; label: string }[] = [];
        if (query.queryTo === 'OE' || query.queryTo === 'BOTH') {
            options = [...options, ...recipients.oeRecipients.map((r: any) => ({ value: String(r.id), label: `${r.name} (${r.email}) - OE` }))];
        }
        if (query.queryTo === 'TE' || query.queryTo === 'BOTH') {
            options = [...options, ...recipients.teRecipients.map((r: any) => ({ value: String(r.id), label: `${r.name} (${r.email}) - TE` }))];
            options = [...options, ...recipients.tlRecipients.map((r: any) => ({ value: String(r.id), label: `${r.name} (${r.email}) - TL` }))];
        }
        return options;
    };

    return (
        <Card className='pt-0'>
            <CardHeader className="bg-muted/30 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <StatusBadge status={query.status} />
                        <span className="text-sm text-muted-foreground font-medium">To: {query.queryTo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mr-4">
                            <span className="flex items-center gap-1.5">Raised At: {formatDateTime(query.queryRaisedAt)}</span>
                        </div>
                        {isPending && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                    onClick={() => setIsEditing(!isEditing)}
                                    disabled={isUpdating || isDeleting}
                                >
                                    {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => onDelete(query.id)}
                                    disabled={isUpdating || isDeleting}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                    <h4 className="text-sm font-bold uppercase tracking-tight text-muted-foreground/80">Query</h4>
                    {isEditing ? (
                        <div className="space-y-3">
                            <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="min-h-[100px] italic"
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button size="sm" onClick={() => {
                                    onUpdate(query.id, editText);
                                    setIsEditing(false);
                                }}>Save Changes</Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-base text-foreground bg-muted/10 p-4 rounded-lg border border-border/40 leading-relaxed italic">
                            "{query.queryText}"
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <h4 className="text-sm font-bold uppercase tracking-tight text-muted-foreground/80 flex items-center gap-2">
                        {isPending ? "Response Details" : <><CheckCircle2 className="h-4 w-4 text-blue-500" /> Resolution Details</>}
                    </h4>

                    {isPending ? (
                        <Form {...resolveForm}>
                            <form onSubmit={resolveForm.handleSubmit((values) => onResolve(query.id, values))} className="space-y-4">
                                <FieldWrapper control={resolveForm.control} name="responseText" label="Response Text">
                                    {(field) => (
                                        <Textarea
                                            placeholder="Type the resolution or response here..."
                                            className="min-h-[100px] bg-card"
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                    <SelectField
                                        name="respondedBy"
                                        control={resolveForm.control}
                                        label="Response From"
                                        options={getResponderOptions()}
                                    />

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Response At</Label>
                                        <Controller
                                            name="respondedAt"
                                            control={resolveForm.control}
                                            render={({ field }) => (
                                                <DateTimeInput
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    className="w-full"
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90 min-w-[120px]"
                                        disabled={isResponding}
                                    >
                                        {isResponding ? "Saving..." : "Resolve Query"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    ) : (
                        <div className="bg-blue-50/30 p-4 rounded-lg border border-blue-100/50 space-y-3">
                            <p className="text-base text-foreground font-medium">
                                {query.responseText}
                            </p>
                            <div className="pt-3 border-t border-blue-100/30 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground italic">
                                <span>Responded By: {query.respondedByName || `ID ${query.respondedBy}`}</span>
                                {query.respondedAt && <span>Timestamp: {formatDateTime(query.respondedAt)}</span>}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export const WoRaiseQueryEditForm = ({ woDetailsId, initialQueries }: WoRaiseQueryEditFormProps) => {
    const { data: user } = useCurrentUser();
    const navigate = useNavigate();
    const { data: recipients } = usePotentialRecipients(woDetailsId);
    const { mutate: createBulkQueries, isPending: addingNew } = useCreateBulkWoQueries();
    const { mutate: respondToQuery, isPending: responding } = useRespondToQuery();
    const { mutate: updateQuery, isPending: updating } = useUpdateWoQuery();
    const { mutate: deleteQuery, isPending: deleting } = useDeleteWoQuery();

    const [existingQueries, setExistingQueries] = useState<WoQuery[]>(initialQueries);

    const form = useForm<RaiseQueryValues>({
        resolver: zodResolver(RaiseQuerySchema),
        defaultValues: {
            queries: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'queries',
    });

    const queriesWatch = useWatch({
        control: form.control,
        name: 'queries',
    });

    const prevQueriesToRef = useRef<string[]>([]);

    useEffect(() => {
        queriesWatch.forEach((query, index) => {
            if (prevQueriesToRef.current[index] !== query.queryTo) {
                if (prevQueriesToRef.current[index] !== undefined) {
                    form.setValue(`queries.${index}.queryToUserIds`, []);
                }
                prevQueriesToRef.current[index] = query.queryTo;
            }
        });
        if (prevQueriesToRef.current.length > queriesWatch.length) {
            prevQueriesToRef.current = prevQueriesToRef.current.slice(0, queriesWatch.length);
        }
    }, [queriesWatch, form]);

    const handleResolve = (queryId: number, values: ResolveQueryValues) => {
        respondToQuery({
            id: queryId,
            data: {
                responseText: values.responseText,
                respondedBy: Number(values.respondedBy),
                respondedAt: values.respondedAt
            }
        }, {
            onSuccess: (updatedQuery: WoQuery) => {
                toast.success("Query resolved successfully");
                setExistingQueries(prev => prev.map(q => q.id === queryId ? { ...q, ...updatedQuery } : q));
            }
        });
    };

    const handleUpdate = (queryId: number, queryText: string) => {
        updateQuery({
            id: queryId,
            data: { queryText }
        }, {
            onSuccess: (updatedQuery: WoQuery) => {
                setExistingQueries(prev => prev.map(q => q.id === queryId ? { ...q, ...updatedQuery } : q));
            }
        });
    };

    const handleDelete = (queryId: number) => {
        if (!confirm("Are you sure you want to delete this query?")) return;

        deleteQuery(queryId, {
            onSuccess: () => {
                setExistingQueries(prev => prev.filter(q => q.id !== queryId));
            }
        });
    };

    const onSubmitNew = (values: RaiseQueryValues) => {
        if (!user?.id || values.queries.length === 0) return;

        createBulkQueries({
            woDetailsId,
            queryBy: user.id,
            queries: values.queries.map(q => ({
                queryTo: q.queryTo,
                queryToUserIds: q.queryToUserIds.map(Number),
                queryText: q.queryText,
            })),
        }, {
            onSuccess: (result) => {
                toast.success(`${result.count} new queries raised successfully`);
                setExistingQueries(prev => [...result.queries, ...prev]);
                form.reset({ queries: [] });
                prevQueriesToRef.current = [];
            },
            onError: (err: any) => {
                toast.error(err?.message || "Failed to raise new queries");
            }
        });
    };

    const getRecipientOptions = (queryTo: string) => {
        if (!recipients) return [];
        let options: { value: string; label: string }[] = [];
        if (queryTo === 'OE' || queryTo === 'BOTH') {
            options = [...options, ...recipients.oeRecipients.map(r => ({ value: String(r.id), label: `${r.name} (${r.email}) - OE` }))];
        }
        if (queryTo === 'TE' || queryTo === 'BOTH') {
            options = [...options, ...recipients.teRecipients.map(r => ({ value: String(r.id), label: `${r.name} (${r.email}) - TE` }))];
            options = [...options, ...recipients.tlRecipients.map(r => ({ value: String(r.id), label: `${r.name} (${r.email}) - TL` }))];
        }
        return options;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold">Edit & Resolve Queries</CardTitle>
                        <CardDescription className="mt-2 text-base text-muted-foreground">
                            Review and respond to existing queries or raise new ones for this Work Order.
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(paths.operations.woDetailAcceptanceListPage)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Acceptance
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            <History className="h-4 w-4" /> Existing Queries ({existingQueries.length})
                        </h3>
                    </div>
                    {existingQueries.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                            <p className="text-muted-foreground">No queries raised yet.</p>
                        </div>
                    ) : (
                        existingQueries.map((query) => (
                            <ExistingQueryItem
                                key={query.id}
                                query={query}
                                onResolve={handleResolve}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                                isResponding={responding}
                                isUpdating={updating}
                                isDeleting={deleting}
                                recipients={recipients}
                            />
                        ))
                    )}
                </div>

                <div className="pt-8 border-t mt-8">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider px-1 mb-6">
                        <Plus className="h-4 w-4" /> Raise New Queries
                    </h3>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitNew)} className="space-y-8">
                            <div className="space-y-6">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="relative group border rounded-xl p-6 shadow-sm bg-card transition-all hover:shadow-md border-border/60">
                                        <div className="flex flex-row items-center justify-between mb-6">
                                            <h3 className="text-lg font-semibold flex items-center gap-2 text-primary/80">
                                                <div className="bg-primary/5 p-2 rounded-lg text-primary">
                                                    <Plus className="h-4 w-4" />
                                                </div>
                                                New Query #{index + 1}
                                            </h3>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => remove(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectField<RaiseQueryValues, `queries.${number}.queryTo` | any>
                                                control={form.control}
                                                name={`queries.${index}.queryTo` as any}
                                                label="Raise Query To"
                                                placeholder="Select target team"
                                                options={[
                                                    { value: 'OE', label: 'OE (Operations Executive)' },
                                                    { value: 'TE', label: 'TE (Tendering Executive)' },
                                                    { value: 'BOTH', label: 'Both' },
                                                ]}
                                            />

                                            <MultiSelectField<RaiseQueryValues, `queries.${number}.queryToUserIds` | any>
                                                control={form.control}
                                                name={`queries.${index}.queryToUserIds` as any}
                                                label="Select Recipients"
                                                placeholder="Search users..."
                                                options={getRecipientOptions(form.watch(`queries.${index}.queryTo`))}
                                            />
                                        </div>

                                        <div className="mt-6">
                                            <FieldWrapper control={form.control} name={`queries.${index}.queryText` as any} label="What is your Query?">
                                                {(field) => (
                                                    <Textarea
                                                        placeholder="Type your query details here..."
                                                        className="min-h-[120px] resize-none border-input focus:ring-primary/20 bg-muted/5"
                                                        {...field}
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20 p-6 rounded-xl border border-dashed border-border transition-colors hover:bg-muted/30">
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-primary/60" />
                                    Need to add more clarifications? Click to add.
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-primary font-medium shadow-sm"
                                    onClick={() => append({ queryTo: 'OE', queryToUserIds: [], queryText: '' })}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Another Query
                                </Button>
                            </div>

                            {fields.length > 0 && (
                                <div className="flex justify-end gap-3 pt-6 border-t border-border/60">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            form.reset({ queries: [] });
                                            prevQueriesToRef.current = [];
                                        }}
                                        disabled={addingNew}
                                    >
                                        Clear New Queries
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-orange-500 hover:bg-orange-600 text-white min-w-[180px] shadow-lg shadow-orange-500/20"
                                        disabled={addingNew}
                                    >
                                        {addingNew ? (
                                            <span className="flex items-center gap-2">
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Raising Queries...
                                            </span>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Submit New Queries
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </form>
                    </Form>
                </div>
            </CardContent>
        </Card>
    );
};
