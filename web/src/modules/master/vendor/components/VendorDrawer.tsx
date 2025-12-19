import { useEffect, useMemo } from 'react'
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
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations'
import { useCreateVendor, useUpdateVendor } from '@/hooks/api/useVendors'
import type { Vendor } from '@/types/api.types'
import FieldWrapper from '@/components/form/FieldWrapper'

const VendorFormSchema = z.object({
    organizationId: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address').optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    status: z.boolean().default(true),
})

type VendorFormValues = z.infer<typeof VendorFormSchema>

type VendorDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    vendor?: Vendor | null
    onSuccess?: () => void
}

export const VendorDrawer = ({ open, onOpenChange, vendor, onSuccess }: VendorDrawerProps) => {
    const { data: organizations = [] } = useVendorOrganizations()
    const createVendor = useCreateVendor()
    const updateVendor = useUpdateVendor()
    const isEdit = !!vendor

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(VendorFormSchema) as any,
        defaultValues: {
            organizationId: '',
            name: '',
            email: '',
            address: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && vendor) {
            form.reset({
                organizationId: vendor.organizationId ? String(vendor.organizationId) : '',
                name: vendor.name ?? '',
                email: vendor.email ?? '',
                address: vendor.address ?? '',
                status: vendor.status ?? true,
            })
        } else {
            form.reset({
                organizationId: '',
                name: '',
                email: '',
                address: '',
                status: true,
            })
        }
    }, [form, isEdit, vendor, open])

    const saving = createVendor.isPending || updateVendor.isPending

    const handleSubmit = async (values: VendorFormValues) => {
        try {
            const payload = {
                organizationId: values.organizationId ? Number(values.organizationId) : null,
                name: values.name.trim(),
                email: values.email?.trim() ? values.email.trim() : null,
                address: values.address?.trim() ? values.address.trim() : null,
                status: values.status,
            }

            if (isEdit && vendor) {
                await updateVendor.mutateAsync({ id: vendor.id, data: payload as any })
            } else {
                await createVendor.mutateAsync(payload as any)
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
                    <SheetTitle>{isEdit ? 'Edit Vendor' : 'Create Vendor'}</SheetTitle>
                    <SheetDescription>
                        {isEdit ? 'Update vendor details' : 'Add a new vendor to the system'}
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6 px-1">
                        <FieldWrapper control={form.control} name="organizationId" label="Organization">
                            {(field) => <Input placeholder="Organization" {...field} />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="name" label="Vendor Name">
                            {(field) => <Input placeholder="Enter vendor name" {...field} />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="email" label="Email (optional)">
                            {(field) => <Input type="email" placeholder="Enter email address" {...field as any} />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="address" label="Address (optional)">
                            {(field) => <Textarea placeholder="Enter address" {...field as any} rows={3} />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="status" label="Active">
                            {(field) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
                        </FieldWrapper>
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
