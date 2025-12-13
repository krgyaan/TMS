import { useEffect, useMemo, useState } from 'react'
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

type StatusDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    status?: Status | null
    onSuccess?: () => void
}

export const StatusDrawer = ({ open, onOpenChange, status, onSuccess }: StatusDrawerProps) => {
    const createStatus = useCreateStatus()
    const updateStatus = useUpdateStatus()
    const { data: existingStatuses = [] } = useStatuses()
    const [customCategory, setCustomCategory] = useState(false)
    const isEdit = !!status

    const form = useForm<StatusFormValues>({
        resolver: zodResolver(StatusFormSchema) as any,
        defaultValues: {
            name: '',
            tenderCategory: '',
            status: true,
        },
    })

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
        if (isEdit && status) {
            form.reset({
                name: status.name ?? '',
                tenderCategory: status.tenderCategory ?? '',
                status: status.status ?? true,
            })
            const hasOption = categoryOptions.some((option) => option.id === status.tenderCategory)
            setCustomCategory(!hasOption && !!status.tenderCategory)
        } else {
            form.reset({
                name: '',
                tenderCategory: '',
                status: true,
            })
            setCustomCategory(false)
        }
    }, [form, isEdit, status, open, categoryOptions])

    const handleCategoryModeToggle = () => {
        setCustomCategory((prev) => {
            const next = !prev
            if (!next) {
                const hasExisting = categoryOptions.some(
                    (option) => option.id === form.getValues('tenderCategory')?.trim(),
                )
                if (!hasExisting) {
                    form.setValue('tenderCategory', '')
                }
            }
            return next
        })
    }

    const saving = createStatus.isPending || updateStatus.isPending

    const handleSubmit = async (values: StatusFormValues) => {
        try {
            const payload = {
                name: values.name.trim(),
                tenderCategory: values.tenderCategory?.trim() ? values.tenderCategory.trim() : null,
                status: values.status,
            }

            if (isEdit && status) {
                await updateStatus.mutateAsync({ id: status.id, data: payload as any })
            } else {
                await createStatus.mutateAsync(payload as any)
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
                    <SheetTitle>{isEdit ? 'Edit Status' : 'Create Status'}</SheetTitle>
                    <SheetDescription>
                        {isEdit ? 'Update status details' : 'Add a new status to the system'}
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6 px-1">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter status name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="space-y-2">
                            {customCategory ? (
                                <FormField
                                    control={form.control}
                                    name="tenderCategory"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tender Category</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter category"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
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
