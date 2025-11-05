import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField, type SelectOption } from '@/components/form/SelectField';
import { useCreateItem, useUpdateItem } from '@/hooks/api/useItems';
import { useTeams } from '@/hooks/api/useTeams';
import { useItemHeadings } from '@/hooks/api/useItemHeadings';
import type { Item } from '@/types/api.types';
import { paths } from '@/app/routes/paths';
import { Checkbox } from '@/components/ui/checkbox';

const ItemSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }).max(100),
    teamId: z.string(), // String because SelectField uses string
    headingId: z.string(),
    status: z.boolean().default(true),
});

type ItemValues = z.infer<typeof ItemSchema>;

interface ItemFormProps {
    item?: Item;
    mode: 'create' | 'edit';
}

export function ItemForm({ item, mode }: ItemFormProps) {
    const navigate = useNavigate();
    const createItem = useCreateItem();
    const updateItem = useUpdateItem();

    // Fetch options
    const { data: teams = [] } = useTeams();
    const { data: headings = [] } = useItemHeadings();

    const form = useForm<ItemValues>({
        resolver: zodResolver(ItemSchema),
        defaultValues: {
            name: '',
            teamId: '',
            headingId: '',
            status: true,
        },
    });

    useEffect(() => {
        if (item && mode === 'edit') {
            form.reset({
                name: item.name,
                teamId: item.teamId ? String(item.teamId) : '',
                headingId: item.headingId ? String(item.headingId) : '',
                status: item.status,
            });
        }
    }, [item, mode, form]);

    // Prepare options for SelectField
    const teamOptions: SelectOption[] = useMemo(
        () => [
            { id: '', name: 'Select Team' },
            ...teams.map((t) => ({ id: String(t.id), name: t.name })),
        ],
        [teams]
    );

    const headingOptions: SelectOption[] = useMemo(
        () => [
            { id: '', name: 'Select Heading' },
            ...headings.map((h) => ({ id: String(h.id), name: h.name })),
        ],
        [headings]
    );

    const onSubmit: SubmitHandler<ItemValues> = async (values) => {
        try {
            const payload = {
                name: values.name,
                teamId: values.teamId ? Number(values.teamId) : undefined,
                headingId: values.headingId ? Number(values.headingId) : undefined,
                status: values.status,
            };

            if (mode === 'create') {
                await createItem.mutateAsync(payload);
            } else if (item) {
                await updateItem.mutateAsync({ id: item.id, data: payload });
            }

            navigate(paths.master.items);
        } catch (error) {
            console.error('Form error:', error);
        }
    };

    const saving = createItem.isPending || updateItem.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create Item' : 'Edit Item'}</CardTitle>
                <CardDescription>
                    {mode === 'create' ? 'Add a new item' : 'Update item information'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FieldWrapper<ItemValues, 'name'>
                                control={form.control}
                                name="name"
                                label="Item Name"
                            >
                                {(field) => <Input placeholder="Enter item name" {...field} />}
                            </FieldWrapper>

                            <SelectField<ItemValues, 'teamId'>
                                control={form.control}
                                name="teamId"
                                label="Team"
                                options={teamOptions.filter((o) => o.id)} // Filter empty
                                placeholder="Select Team"
                            />

                            <SelectField<ItemValues, 'headingId'>
                                control={form.control}
                                name="headingId"
                                label="Heading"
                                options={headingOptions.filter((o) => o.id)}
                                placeholder="Select Heading"
                            />

                            <FieldWrapper<ItemValues, 'status'>
                                control={form.control}
                                name="status"
                                label="Status"
                            >
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        <span className="text-sm">Active</span>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="flex items-center justify-center gap-2">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : mode === 'create' ? 'Create Item' : 'Update Item'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.master.items)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => form.reset()}
                                disabled={saving}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
