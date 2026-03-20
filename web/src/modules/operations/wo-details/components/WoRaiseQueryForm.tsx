import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { Plus, Trash2, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { usePotentialRecipients, useCreateBulkWoQueries } from '@/hooks/api/useWoQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrentUser } from '@/hooks/api/useAuth';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { toast } from 'sonner';

const QueryItemSchema = z.object({
    queryTo: z.enum(['TE', 'OE', 'BOTH']),
    queryToUserIds: z.array(z.string()).min(1, 'Please select at least one recipient'),
    queryText: z.string().min(1, 'Query text is required'),
});

const RaiseQuerySchema = z.object({
    queries: z.array(QueryItemSchema).min(1),
});

type RaiseQueryValues = z.infer<typeof RaiseQuerySchema>;

interface WoRaiseQueryFormProps {
    woDetailsId: number;
}

export const WoRaiseQueryForm = ({ woDetailsId }: WoRaiseQueryFormProps) => {
    const { data: user } = useCurrentUser();
    const navigate = useNavigate();
    const { data: recipients, isLoading: loadingRecipients, error: recipientsError } = usePotentialRecipients(woDetailsId);
    const { mutate: createBulkQueries, isPending: submitting } = useCreateBulkWoQueries();

    const form = useForm<RaiseQueryValues>({
        resolver: zodResolver(RaiseQuerySchema),
        defaultValues: {
            queries: [{ queryTo: 'OE', queryToUserIds: [], queryText: '' }],
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
                // Only reset if it's not the initial load of this field
                if (prevQueriesToRef.current[index] !== undefined) {
                    form.setValue(`queries.${index}.queryToUserIds`, []);
                }
                prevQueriesToRef.current[index] = query.queryTo;
            }
        });
        // Truncate ref if fields were removed
        if (prevQueriesToRef.current.length > queriesWatch.length) {
            prevQueriesToRef.current = prevQueriesToRef.current.slice(0, queriesWatch.length);
        }
    }, [queriesWatch, form]);

    const onSubmit = (values: RaiseQueryValues) => {
        if (!user?.id) return;

        createBulkQueries({
            woDetailsId,
            queryBy: user.id,
            queries: values.queries.map(q => ({
                queryTo: q.queryTo,
                queryToUserIds: q.queryToUserIds.map(Number),
                queryText: q.queryText,
            })),
        }, {
            onSuccess: () => {
                toast.success("Queries raised successfully");
                navigate(paths.operations.woAcceptancePage(woDetailsId));
            },
            onError: (err: any) => {
                toast.error(err?.message || "Failed to raise queries");
            }
        });
    };

    if (loadingRecipients) {
        return (
            <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (recipientsError) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load potential recipients. Please refresh the page.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const getRecipientOptions = (queryTo: string) => {
        if (!recipients) return [];

        let options: { value: string; label: string }[] = [];

        if (queryTo === 'OE' || queryTo === 'BOTH') {
            options = [...options, ...recipients.oeRecipients.map(r => ({
                value: String(r.id),
                label: `${r.name} (${r.email}) - OE`,
            }))];
        }

        if (queryTo === 'TE' || queryTo === 'BOTH') {
            options = [...options, ...recipients.teRecipients.map(r => ({
                value: String(r.id),
                label: `${r.name} (${r.email}) - TE`,
            }))];

            options = [...options, ...recipients.tlRecipients.map(r => ({
                value: String(r.id),
                label: `${r.name} (${r.email}) - TL`,
            }))];
        }

        return options;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold">Raise Clarification Query</CardTitle>
                        <CardDescription className="mt-2 text-base">
                            Submit queries to the Tendering (TE) or Operations (OE) teams regarding this Work Order.
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="px-0 pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-6">
                                    <div className="flex flex-row items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold flex items-center gap-2 text-primary/80">
                                            <div className="bg-primary/5 p-2 rounded-lg text-primary">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                            Query #{index + 1}
                                        </h3>
                                        {fields.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => remove(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
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

                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20 p-6">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-primary/60" />
                                Need to ask more? You can add multiple queries.
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-primary font-medium"
                                onClick={() => append({ queryTo: 'OE', queryToUserIds: [], queryText: '' })}
                            >
                                <Plus className="h-4 w-4" />
                                Add Another Query
                            </Button>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-border/60">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={submitting}
                                className="min-w-[100px]"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    form.reset();
                                    prevQueriesToRef.current = [];
                                }}
                                disabled={submitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                className="bg-orange-500 hover:bg-orange-600 text-white min-w-[160px] shadow-lg shadow-orange-500/20"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Raising...
                                    </span>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Raise Queries
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};
