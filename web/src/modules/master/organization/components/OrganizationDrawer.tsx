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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { SelectField } from '@/components/form/SelectField'
import type { SelectOption } from '@/components/form/SelectField'
import { useIndustries } from '@/hooks/api/useIndustries'
import { useCreateOrganization, useUpdateOrganization } from '@/hooks/api/useOrganizations'
import type { Organization } from '@/types/api.types'

const OrganizationFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    acronym: z.string().max(50, 'Acronym cannot exceed 50 characters').optional().nullable(),
    industryId: z.string().optional(),
    status: z.boolean().default(true),
})

type OrganizationFormValues = z.infer<typeof OrganizationFormSchema>

type OrganizationDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    organization?: Organization | null
    onSuccess?: () => void
}

export const OrganizationDrawer = ({
    open,
    onOpenChange,
    organization,
    onSuccess,
}: OrganizationDrawerProps) => {
    const { data: industries = [] } = useIndustries()
    const createOrganization = useCreateOrganization()
    const updateOrganization = useUpdateOrganization()
    const isEdit = !!organization

    const industryOptions = useMemo<SelectOption[]>(
        () =>
            industries
                .filter((industry) => industry.status)
                .map((industry) => ({ id: String(industry.id), name: industry.name })),
        [industries],
    )

    const form = useForm<OrganizationFormValues>({
        resolver: zodResolver(OrganizationFormSchema) as any,
        defaultValues: {
            name: '',
            acronym: '',
            industryId: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && organization) {
            form.reset({
                name: organization.name ?? '',
                acronym: organization.acronym ?? '',
                industryId: organization.industryId ? String(organization.industryId) : '',
                status: organization.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                acronym: '',
                industryId: '',
                status: true,
            })
        }
    }, [form, isEdit, organization, open])

    const saving = createOrganization.isPending || updateOrganization.isPending

    const handleSubmit = async (values: OrganizationFormValues) => {
        try {
            const payload = {
                name: values.name.trim(),
                acronym: values.acronym?.trim() ? values.acronym.trim() : null,
                industryId: values.industryId ? Number(values.industryId) : null,
                status: values.status,
            }

            if (isEdit && organization) {
                await updateOrganization.mutateAsync({ id: organization.id, data: payload as any })
            } else {
                await createOrganization.mutateAsync(payload as any)
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
                    <SheetTitle>{isEdit ? 'Edit Organization' : 'Create Organization'}</SheetTitle>
                    <SheetDescription>
                        {isEdit ? 'Update organization details' : 'Add a new organization to the system'}
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6 px-1">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Organization Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter organization name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="acronym"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Acronym (optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Short code" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <SelectField
                            control={form.control}
                            name="industryId"
                            label="Industry (optional)"
                            options={industryOptions}
                            placeholder="Select industry"
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
