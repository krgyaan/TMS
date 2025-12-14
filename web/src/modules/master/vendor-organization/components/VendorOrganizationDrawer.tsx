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
import { useCreateVendorOrganization, useUpdateVendorOrganization } from '@/hooks/api/useVendorOrganizations'
import type { VendorOrganization } from '@/types/api.types'

const VendorOrganizationFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    address: z.string().max(500).optional(),
    status: z.boolean().default(true),
})

type VendorOrganizationFormValues = z.infer<typeof VendorOrganizationFormSchema>

type VendorOrganizationDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    vendorOrganization?: VendorOrganization | null
    onSuccess?: () => void
}

export const VendorOrganizationDrawer = ({
    open,
    onOpenChange,
    vendorOrganization,
    onSuccess
}: VendorOrganizationDrawerProps) => {
    const createVendorOrganization = useCreateVendorOrganization()
    const updateVendorOrganization = useUpdateVendorOrganization()
    const isEdit = !!vendorOrganization

    const form = useForm<VendorOrganizationFormValues>({
        resolver: zodResolver(VendorOrganizationFormSchema),
        defaultValues: {
            name: '',
            address: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && vendorOrganization) {
            form.reset({
                name: vendorOrganization.name || '',
                address: vendorOrganization.address || '',
                status: vendorOrganization.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                address: '',
                status: true,
            })
        }
    }, [form, isEdit, vendorOrganization, open])

    const saving = createVendorOrganization.isPending || updateVendorOrganization.isPending

    const handleSubmit = async (values: VendorOrganizationFormValues) => {
        try {
            if (isEdit && vendorOrganization) {
                await updateVendorOrganization.mutateAsync({ id: vendorOrganization.id, data: values })
            } else {
                await createVendorOrganization.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit Vendor Organization' : 'Create Vendor Organization'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update vendor organization details'
                            : 'Add a new vendor organization to the system'}
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
                                        <Input placeholder="Enter organization name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter organization address (optional)"
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
