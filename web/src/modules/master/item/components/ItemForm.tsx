import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { paths } from '@/app/routes/paths'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { FieldWrapper } from '@/components/form/FieldWrapper'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { SelectField } from '@/components/form/SelectField'
import type { SelectOption } from '@/components/form/SelectField'
import { useTeams } from '@/hooks/api/useTeams'
import { useItemHeadings } from '@/hooks/api/useItemHeadings'
import { useCreateItem, useUpdateItem } from '@/hooks/api/useItems'
import type { Item } from '@/types/api.types'

const ItemFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    teamId: z.string().optional(),
    headingId: z.string().optional(),
    status: z.boolean().default(true),
})

type ItemFormValues = z.infer<typeof ItemFormSchema>

type ItemFormProps = {
    mode: 'create' | 'edit'
    item?: Item
}

export const ItemForm = ({ mode, item }: ItemFormProps) => {
    const navigate = useNavigate()
    const { data: teams = [] } = useTeams()
    const { data: headings = [] } = useItemHeadings()
    const createItem = useCreateItem()
    const updateItem = useUpdateItem()

    const teamOptions = useMemo<SelectOption[]>(
        () => teams.map((team) => ({ id: String(team.id), name: team.name })),
        [teams],
    )
    const headingOptions = useMemo<SelectOption[]>(
        () => headings.map((heading) => ({ id: String(heading.id), name: heading.name })),
        [headings],
    )

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(ItemFormSchema),
        defaultValues: {
            name: '',
            teamId: '',
            headingId: '',
            status: true,
        },
    })

    useEffect(() => {
        if (mode === 'edit' && item) {
            form.reset({
                name: item.name ?? '',
                teamId: item.teamId ? String(item.teamId) : '',
                headingId: item.headingId ? String(item.headingId) : '',
                status: item.status ?? true,
            })
        }
    }, [form, mode, item])

    const saving = createItem.isPending || updateItem.isPending

    const handleSubmit = async (values: ItemFormValues) => {
        const payload = {
            name: values.name.trim(),
            teamId: values.teamId ? Number(values.teamId) : null,
            headingId: values.headingId ? Number(values.headingId) : null,
            status: values.status,
        }

        if (mode === 'create') {
            await createItem.mutateAsync(payload)
        } else if (item) {
            await updateItem.mutateAsync({ id: item.id, data: payload })
        }

        navigate(paths.master.items)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create Item' : 'Edit Item'}</CardTitle>
                <CardDescription>Manage items, teams and headings</CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.master.items)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to list
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            <FieldWrapper control={form.control} name="name" label="Item Name">
                                {(field) => <Input placeholder="Enter item name" {...field} />}
                            </FieldWrapper>
                            <SelectField
                                control={form.control}
                                name="teamId"
                                label="Team (optional)"
                                options={teamOptions}
                                placeholder="Select team"
                            />
                            <SelectField
                                control={form.control}
                                name="headingId"
                                label="Heading (optional)"
                                options={headingOptions}
                                placeholder="Select heading"
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Status</FormLabel>
                                        <FormDescription>Inactive items are hidden from selection lists.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) => field.onChange(checked === true)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={saving}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : mode === 'create' ? 'Create Item' : 'Update Item'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

export default ItemForm
