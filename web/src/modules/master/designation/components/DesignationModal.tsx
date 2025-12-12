import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateDesignation, useUpdateDesignation } from '@/hooks/api/useDesignations'
import type { Designation } from '@/types/api.types'

const DesignationFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().default(true),
})

type DesignationFormValues = z.infer<typeof DesignationFormSchema>

type DesignationModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    designation?: Designation | null
    onSuccess?: () => void
}

export const DesignationModal = ({
    open,
    onOpenChange,
    designation,
    onSuccess,
}: DesignationModalProps) => {
    const createDesignation = useCreateDesignation()
    const updateDesignation = useUpdateDesignation()
    const isEdit = !!designation

    const form = useForm<DesignationFormValues>({
        resolver: zodResolver(DesignationFormSchema),
        defaultValues: {
            name: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && designation) {
            form.reset({
                name: designation.name || '',
                status: designation.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                status: true,
            })
        }
    }, [form, isEdit, designation, open])

    const saving = createDesignation.isPending || updateDesignation.isPending

    const handleSubmit = async (values: DesignationFormValues) => {
        try {
            if (isEdit && designation) {
                await updateDesignation.mutateAsync({ id: designation.id, data: values })
            } else {
                await createDesignation.mutateAsync(values)
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            // Error handling is done in the hook
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Designation' : 'Create Designation'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Update designation details'
                            : 'Add a new designation to the system'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter designation name" {...field} />
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
                        <DialogFooter>
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
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
