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
import { useCreateEmdResponsibility, useUpdateEmdResponsibility } from '@/hooks/api/useEmdResponsibility'
import type { EmdResponsibility } from '@/types/api.types'

const EmdResponsibilityFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().default(true),
})

type EmdResponsibilityFormValues = z.infer<typeof EmdResponsibilityFormSchema>

type EmdResponsibilityDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    emdResponsibility?: EmdResponsibility | null
    onSuccess?: () => void
}

export const EmdResponsibilityDrawer = ({
    open,
    onOpenChange,
    emdResponsibility,
    onSuccess
}: EmdResponsibilityDrawerProps) => {
    const createEmdResponsibility = useCreateEmdResponsibility()
    const updateEmdResponsibility = useUpdateEmdResponsibility()
    const isEdit = !!emdResponsibility

    const form = useForm<EmdResponsibilityFormValues>({
        resolver: zodResolver(EmdResponsibilityFormSchema) as any,
        defaultValues: {
            name: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && emdResponsibility) {
            form.reset({
                name: emdResponsibility.name || '',
                status: emdResponsibility.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                status: true,
            })
        }
    }, [form, isEdit, emdResponsibility, open])

    const saving = createEmdResponsibility.isPending || updateEmdResponsibility.isPending

    const handleSubmit = async (values: EmdResponsibilityFormValues) => {
        try {
            if (isEdit && emdResponsibility) {
                await updateEmdResponsibility.mutateAsync({ id: emdResponsibility.id, data: values })
            } else {
                await createEmdResponsibility.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit EMD Responsibility' : 'Create EMD Responsibility'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update EMD responsibility details'
                            : 'Add a new EMD responsibility to the system'}
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
                                        <Input placeholder="Enter EMD responsibility name" {...field} />
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
