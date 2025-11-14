import { useEffect } from 'react'
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
import { useCreateLocation, useUpdateLocation } from '@/hooks/api/useLocations'
import type { Location } from '@/types/api.types'

const LocationFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    acronym: z.string().max(20, 'Acronym cannot exceed 20 characters').optional().nullable(),
    state: z.string().max(100, 'State cannot exceed 100 characters').optional().nullable(),
    region: z.string().max(100, 'Region cannot exceed 100 characters').optional().nullable(),
    status: z.boolean().default(true),
})

type LocationFormValues = z.infer<typeof LocationFormSchema>

type LocationFormProps = {
    mode: 'create' | 'edit'
    location?: Location
}

export const LocationForm = ({ mode, location }: LocationFormProps) => {
    const navigate = useNavigate()
    const createLocation = useCreateLocation()
    const updateLocation = useUpdateLocation()

    const form = useForm<LocationFormValues>({
        resolver: zodResolver(LocationFormSchema),
        defaultValues: {
            name: '',
            acronym: '',
            state: '',
            region: '',
            status: true,
        },
    })

    useEffect(() => {
        if (mode === 'edit' && location) {
            form.reset({
                name: location.name ?? '',
                acronym: location.acronym ?? '',
                state: location.state ?? '',
                region: location.region ?? '',
                status: location.status ?? true,
            })
        }
    }, [form, mode, location])

    const saving = createLocation.isPending || updateLocation.isPending

    const handleSubmit = async (values: LocationFormValues) => {
        const payload = {
            name: values.name.trim(),
            acronym: values.acronym?.trim() ? values.acronym.trim() : null,
            state: values.state?.trim() ? values.state.trim() : null,
            region: values.region?.trim() ? values.region.trim() : null,
            status: values.status,
        }

        if (mode === 'create') {
            await createLocation.mutateAsync(payload)
        } else if (location) {
            await updateLocation.mutateAsync({ id: location.id, data: payload })
        }

        navigate(paths.master.locations)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create Location' : 'Edit Location'}</CardTitle>
                <CardDescription>Manage locations and their metadata</CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.master.locations)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to list
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            <FieldWrapper control={form.control} name="name" label="Location Name">
                                {(field) => <Input placeholder="Enter location name" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="acronym" label="Acronym (optional)">
                                {(field) => <Input placeholder="Short code" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="state" label="State (optional)">
                                {(field) => <Input placeholder="State name" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="region" label="Region (optional)">
                                {(field) => <Input placeholder="Region" {...field} />}
                            </FieldWrapper>
                        </div>

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Status</FormLabel>
                                        <FormDescription>Inactive locations will be hidden across the app.</FormDescription>
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
                                {saving ? 'Saving...' : mode === 'create' ? 'Create Location' : 'Update Location'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
