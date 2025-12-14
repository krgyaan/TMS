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
import { useCreateImprestCategory, useUpdateImprestCategory } from '@/hooks/api/useImprestCategories'
import type { ImprestCategory } from '@/types/api.types'

const ImprestCategoryFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    heading: z.string().max(100).optional(),
    status: z.boolean().default(true),
})

type ImprestCategoryFormValues = z.infer<typeof ImprestCategoryFormSchema>

type ImprestCategoryDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    imprestCategory?: ImprestCategory | null
    onSuccess?: () => void
}

export const ImprestCategoryDrawer = ({
    open,
    onOpenChange,
    imprestCategory,
    onSuccess
}: ImprestCategoryDrawerProps) => {
    const createImprestCategory = useCreateImprestCategory()
    const updateImprestCategory = useUpdateImprestCategory()
    const isEdit = !!imprestCategory

    const form = useForm<ImprestCategoryFormValues>({
        resolver: zodResolver(ImprestCategoryFormSchema),
        defaultValues: {
            name: '',
            heading: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && imprestCategory) {
            form.reset({
                name: imprestCategory.name || '',
                heading: imprestCategory.heading || '',
                status: imprestCategory.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                heading: '',
                status: true,
            })
        }
    }, [form, isEdit, imprestCategory, open])

    const saving = createImprestCategory.isPending || updateImprestCategory.isPending

    const handleSubmit = async (values: ImprestCategoryFormValues) => {
        try {
            if (isEdit && imprestCategory) {
                await updateImprestCategory.mutateAsync({ id: imprestCategory.id, data: values })
            } else {
                await createImprestCategory.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit Imprest Category' : 'Create Imprest Category'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update imprest category details'
                            : 'Add a new imprest category to the system'}
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
                            name="heading"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Heading</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter heading (optional)" {...field} />
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
