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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateLeadType, useUpdateLeadType } from '@/hooks/api/useLeadTypes'
import type { LeadType } from '@/types/api.types'

const LeadTypeFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().max(500).optional(),
    status: z.boolean().default(true),
})

type LeadTypeFormValues = z.infer<typeof LeadTypeFormSchema>

type LeadTypeDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    leadType?: LeadType | null
    onSuccess?: () => void
}

export const LeadTypeDrawer = ({
    open,
    onOpenChange,
    leadType,
    onSuccess
}: LeadTypeDrawerProps) => {
    const createLeadType = useCreateLeadType()
    const updateLeadType = useUpdateLeadType()
    const isEdit = !!leadType

    const form = useForm<LeadTypeFormValues>({
        resolver: zodResolver(LeadTypeFormSchema),
        defaultValues: {
            name: '',
            description: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && leadType) {
            form.reset({
                name: leadType.name || '',
                description: leadType.description || '',
                status: leadType.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                description: '',
                status: true,
            })
        }
    }, [form, isEdit, leadType, open])

    const saving = createLeadType.isPending || updateLeadType.isPending

    const handleSubmit = async (values: LeadTypeFormValues) => {
        try {
            if (isEdit && leadType) {
                await updateLeadType.mutateAsync({ id: leadType.id, data: values })
            } else {
                await createLeadType.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit Lead Type' : 'Create Lead Type'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update lead type details'
                            : 'Add a new lead type to the system'}
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
                                        <Input placeholder="Enter lead type name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter description (optional)"
                                            rows={3}
                                            {...field}
                                        />
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
