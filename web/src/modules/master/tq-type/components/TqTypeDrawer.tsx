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
import { useCreateTqType, useUpdateTqType } from '@/hooks/api/useTqTypes'
import type { TqType } from '@/types/api.types'

const TqTypeFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().default(true),
})

type TqTypeFormValues = z.infer<typeof TqTypeFormSchema>

type TqTypeDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    tqType?: TqType | null
    onSuccess?: () => void
}

export const TqTypeDrawer = ({
    open,
    onOpenChange,
    tqType,
    onSuccess
}: TqTypeDrawerProps) => {
    const createTqType = useCreateTqType()
    const updateTqType = useUpdateTqType()
    const isEdit = !!tqType

    const form = useForm<TqTypeFormValues>({
        resolver: zodResolver(TqTypeFormSchema) as any,
        defaultValues: {
            name: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && tqType) {
            form.reset({
                name: tqType.name || '',
                status: tqType.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                status: true,
            })
        }
    }, [form, isEdit, tqType, open])

    const saving = createTqType.isPending || updateTqType.isPending

    const handleSubmit = async (values: TqTypeFormValues) => {
        try {
            if (isEdit && tqType) {
                await updateTqType.mutateAsync({ id: tqType.id, data: values })
            } else {
                await createTqType.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit TQ Type' : 'Create TQ Type'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update TQ type details'
                            : 'Add a new TQ type to the system'}
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6 px-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter TQ type name" {...field} />
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
                        <SheetFooter className="mt-8 pt-4 flex flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={saving}
                                className="w-1/2"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving} className="w-1/2">
                                {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}
