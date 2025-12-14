import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
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

type ItemDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    item?: Item | null
    onSuccess?: () => void
}

export const ItemDrawer = ({ open, onOpenChange, item, onSuccess }: ItemDrawerProps) => {
    const { data: teams = [] } = useTeams()
    const { data: headings = [] } = useItemHeadings()
    const createItem = useCreateItem()
    const updateItem = useUpdateItem()
    const isEdit = !!item

    const teamOptions = useMemo<SelectOption[]>(
        () => teams.map((team) => ({ id: String(team.id), name: team.name })),
        [teams],
    )
    const headingOptions = useMemo<SelectOption[]>(
        () => headings.map((heading) => ({ id: String(heading.id), name: heading.name })),
        [headings],
    )

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(ItemFormSchema) as any,
        defaultValues: {
            name: '',
            teamId: '',
            headingId: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && item) {
            form.reset({
                name: item.name ?? '',
                teamId: item.teamId ? String(item.teamId) : '',
                headingId: item.headingId ? String(item.headingId) : '',
                status: item.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                teamId: '',
                headingId: '',
                status: true,
            })
        }
    }, [form, isEdit, item, open])

    const saving = createItem.isPending || updateItem.isPending

    const handleSubmit = async (values: ItemFormValues) => {
        try {
            const payload = {
                name: values.name.trim(),
                teamId: values.teamId ? Number(values.teamId) : null,
                headingId: values.headingId ? Number(values.headingId) : null,
                status: values.status,
            }

            if (isEdit && item) {
                await updateItem.mutateAsync({ id: item.id, data: payload })
            } else {
                await createItem.mutateAsync(payload)
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            // Error handling is done in the hook
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{isEdit ? 'Edit Item' : 'Create Item'}</SheetTitle>
                    <SheetDescription>
                        {isEdit ? 'Update item details' : 'Add a new item to the system'}
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6 px-1">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Item Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter item name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Active</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <SheetFooter className="mt-8 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}
