import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldWrapper } from '@/components/form/FieldWrapper'
import { SelectField } from '@/components/form/SelectField'
import { ArrowLeft } from 'lucide-react'
import { paths } from '@/app/routes/paths'
import { useCreateStatus, useUpdateStatus, useStatuses } from '@/hooks/api/useStatuses'
import type { Status } from '@/types/api.types'

const StatusFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    tenderCategory: z
        .string()
        .max(100, 'Category cannot exceed 100 characters')
        .optional()
        .nullable(),
    status: z.boolean().default(true),
})

type StatusFormValues = z.infer<typeof StatusFormSchema>

type StatusFormProps = {
    mode: 'create' | 'edit'
    status?: Status
}

export const StatusForm = ({ mode, status }: StatusFormProps) => {
    const navigate = useNavigate()
    const createStatus = useCreateStatus()
    const updateStatus = useUpdateStatus()
    const { data: existingStatuses = [] } = useStatuses()
    const [customCategory, setCustomCategory] = useState(false)

    const form = useForm<StatusFormValues>({
        resolver: zodResolver(StatusFormSchema),
        defaultValues: {
            name: '',
            tenderCategory: '',
            status: true,
        },
    })

    useEffect(() => {
        if (mode === 'edit' && status) {
            form.reset({
                name: status.name ?? '',
                tenderCategory: status.tenderCategory ?? '',
                status: status.status ?? true,
            })
        }
    }, [form, mode, status])

    const categoryOptions = useMemo(
        () => [
            { id: '', name: 'None' },
            ...Array.from(
                new Set(
                    existingStatuses
                        .map((item) => item.tenderCategory)
                        .filter((value): value is string => Boolean(value && value.trim().length)),
                ),
            ).map((value) => ({ id: value, name: value })),
        ],
        [existingStatuses],
    )

    useEffect(() => {
        if (mode === 'edit' && status?.tenderCategory) {
            const hasOption = categoryOptions.some((option) => option.id === status.tenderCategory)
            setCustomCategory(!hasOption)
        } else {
            setCustomCategory(false)
        }
    }, [categoryOptions, mode, status])

    const handleCategoryModeToggle = () => {
        setCustomCategory((prev) => {
            const next = !prev
            if (!next) {
                const hasExisting = categoryOptions.some((option) => option.id === form.getValues('tenderCategory')?.trim())
                if (!hasExisting) {
                    form.setValue('tenderCategory', '')
                }
            }
            return next
        })
    }

    const saving = useMemo(
        () => createStatus.isPending || updateStatus.isPending,
        [createStatus.isPending, updateStatus.isPending],
    )

    const handleSubmit = async (values: StatusFormValues) => {
        const payload = {
            name: values.name.trim(),
            tenderCategory: values.tenderCategory?.trim() ? values.tenderCategory.trim() : null,
            status: values.status,
        }

        if (mode === 'create') {
            await createStatus.mutateAsync(payload)
        } else if (status) {
            await updateStatus.mutateAsync({ id: status.id, data: payload })
        }

        navigate(paths.master.statuses)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create Status' : 'Edit Status'}</CardTitle>
                <CardDescription>Manage tender statuses and their categories</CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.master.statuses)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to list
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            <FieldWrapper control={form.control} name="name" label="Status Name">
                                {(field) => <Input placeholder="Enter status name" {...field} />}
                            </FieldWrapper>

                            <div className="space-y-2">
                                {customCategory ? (
                                    <FieldWrapper control={form.control} name="tenderCategory" label="Tender Category">
                                        {(field) => <Input placeholder="Enter category" {...field} value={field.value ?? ''} />}
                                    </FieldWrapper>
                                ) : (
                                    <SelectField
                                        control={form.control}
                                        name="tenderCategory"
                                        label="Tender Category"
                                        options={categoryOptions}
                                        placeholder="Select tender category"
                                    />
                                )}
                                <Button
                                    type="button"
                                    variant="link"
                                    className="px-0"
                                    onClick={handleCategoryModeToggle}
                                >
                                    {customCategory ? 'Choose from existing categories' : 'Add custom category'}
                                </Button>
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Status</FormLabel>
                                        <FormDescription>Toggle to mark this status as active.</FormDescription>
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
                                {saving ? 'Saving...' : mode === 'create' ? 'Create Status' : 'Update Status'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
