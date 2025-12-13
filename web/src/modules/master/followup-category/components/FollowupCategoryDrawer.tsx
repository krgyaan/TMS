import { useEffect } from 'react'
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
import { useCreateFollowupCategory, useUpdateFollowupCategory } from '@/hooks/api/useFollowupCategories'
import type { FollowupCategory } from '@/types/api.types'

const FollowupCategoryFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().default(true),
})

type FollowupCategoryFormValues = z.infer<typeof FollowupCategoryFormSchema>

type FollowupCategoryDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    followupCategory?: FollowupCategory | null
    onSuccess?: () => void
}

export const FollowupCategoryDrawer = ({
    open,
    onOpenChange,
    followupCategory,
    onSuccess
}: FollowupCategoryDrawerProps) => {
    const createFollowupCategory = useCreateFollowupCategory()
    const updateFollowupCategory = useUpdateFollowupCategory()
    const isEdit = !!followupCategory

    const form = useForm<FollowupCategoryFormValues>({
        resolver: zodResolver(FollowupCategoryFormSchema),
        defaultValues: {
            name: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && followupCategory) {
            form.reset({
                name: followupCategory.name || '',
                status: followupCategory.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                status: true,
            })
        }
    }, [form, isEdit, followupCategory, open])

    const saving = createFollowupCategory.isPending || updateFollowupCategory.isPending

    const handleSubmit = async (values: FollowupCategoryFormValues) => {
        try {
            if (isEdit && followupCategory) {
                await updateFollowupCategory.mutateAsync({ id: followupCategory.id, data: values })
            } else {
                await createFollowupCategory.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit Followup Category' : 'Create Followup Category'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update followup category details'
                            : 'Add a new followup category to the system'}
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6 px-1">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter category name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
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
