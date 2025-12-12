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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateRole, useUpdateRole } from '@/hooks/api/useRoles'
import type { Role } from '@/types/api.types'

const RoleFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().default(true),
})

type RoleFormValues = z.infer<typeof RoleFormSchema>

type RoleModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    role?: Role | null
    onSuccess?: () => void
}

export const RoleModal = ({ open, onOpenChange, role, onSuccess }: RoleModalProps) => {
    const createRole = useCreateRole()
    const updateRole = useUpdateRole()
    const isEdit = !!role

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(RoleFormSchema),
        defaultValues: {
            name: '',
            description: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && role) {
            form.reset({
                name: role.name || '',
                description: role.description || '',
                status: role.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                description: '',
                status: true,
            })
        }
    }, [form, isEdit, role, open])

    const saving = createRole.isPending || updateRole.isPending

    const handleSubmit = async (values: RoleFormValues) => {
        try {
            if (isEdit && role) {
                await updateRole.mutateAsync({ id: role.id, data: values })
            } else {
                await createRole.mutateAsync(values)
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
                    <DialogTitle>{isEdit ? 'Edit Role' : 'Create Role'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update role details' : 'Add a new role to the system'}
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
                                        <Input placeholder="Enter role name" {...field} />
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
                                            placeholder="Enter role description"
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
