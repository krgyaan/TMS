import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { paths } from '@/app/routes/paths'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { FieldWrapper } from '@/components/form/FieldWrapper'
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

type OrganizationFormProps = {
    mode: 'create' | 'edit'
    organization?: Organization
}

export const OrganizationForm = ({ mode, organization }: OrganizationFormProps) => {
    const navigate = useNavigate()
    const { data: industries = [] } = useIndustries()
    const createOrganization = useCreateOrganization()
    const updateOrganization = useUpdateOrganization()

    const industryOptions = useMemo<SelectOption[]>(
        () => industries.filter((industry) => industry.status).map((industry) => ({ id: String(industry.id), name: industry.name })),
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
        if (mode === 'edit' && organization) {
            form.reset({
                name: organization.name ?? '',
                acronym: organization.acronym ?? '',
                industryId: organization.industryId ? String(organization.industryId) : '',
                status: organization.status ?? true,
            })
        }
    }, [form, mode, organization])

    const saving = createOrganization.isPending || updateOrganization.isPending

    const handleSubmit = async (values: OrganizationFormValues) => {
        const payload = {
            name: values.name.trim(),
            acronym: values.acronym?.trim() ? values.acronym.trim() : null,
            industryId: values.industryId ? Number(values.industryId) : null,
            status: values.status,
        }

        if (mode === 'create') {
            await createOrganization.mutateAsync(payload as any)
        } else if (organization) {
            await updateOrganization.mutateAsync({ id: organization.id, data: payload as any })
        }

        navigate(paths.master.organizations)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create Organization' : 'Edit Organization'}</CardTitle>
                <CardDescription>Manage organizations and their industries</CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.master.organizations)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to list
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            <FieldWrapper control={form.control} name="name" label="Organization Name">
                                {(field) => <Input placeholder="Enter organization name" {...field as any} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="acronym" label="Acronym (optional)">
                                {(field) => <Input placeholder="Short code" {...field as any} value={field.value ?? ''} />}
                            </FieldWrapper>
                            <SelectField
                                control={form.control}
                                name="industryId"
                                label="Industry (optional)"
                                options={industryOptions}
                                placeholder="Select industry"
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Status</FormLabel>
                                        <FormDescription>Inactive organizations will be hidden across the app.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) => field.onChange(checked === true)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={saving}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : mode === 'create' ? 'Create Organization' : 'Update Organization'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
