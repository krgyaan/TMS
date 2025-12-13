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
import { useStates } from '@/hooks/api/useStates'
import { useLocations } from '@/hooks/api/useLocations'
import { useCreateLocation, useUpdateLocation } from '@/hooks/api/useLocations'
import type { Location } from '@/types/api.types'

const LocationFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    acronym: z.string().max(20, 'Acronym cannot exceed 20 characters').optional().nullable(),
    state: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    status: z.boolean().default(true),
})

type LocationFormValues = z.infer<typeof LocationFormSchema>

type LocationDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    location?: Location | null
    onSuccess?: () => void
}

export const LocationDrawer = ({ open, onOpenChange, location, onSuccess }: LocationDrawerProps) => {
    const { data: states = [] } = useStates()
    const { data: locations = [] } = useLocations()
    const createLocation = useCreateLocation()
    const updateLocation = useUpdateLocation()
    const isEdit = !!location

    const stateOptions = useMemo<SelectOption[]>(
        () => states.filter((s) => s.status).map((state) => ({ id: state.name, name: state.name })),
        [states],
    )

    const regionOptions = useMemo<SelectOption[]>(
        () =>
            Array.from(
                new Set(
                    locations
                        .map((loc) => loc.region)
                        .filter((value): value is string => Boolean(value && value.trim().length)),
                ),
            ).map((region) => ({ id: region, name: region })),
        [locations],
    )

    const form = useForm<LocationFormValues>({
        resolver: zodResolver(LocationFormSchema) as any,
        defaultValues: {
            name: '',
            acronym: '',
            state: '',
            region: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && location) {
            form.reset({
                name: location.name ?? '',
                acronym: location.acronym ?? '',
                state: location.state ?? '',
                region: location.region ?? '',
                status: location.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                acronym: '',
                state: '',
                region: '',
                status: true,
            })
        }
    }, [form, isEdit, location, open])

    const saving = createLocation.isPending || updateLocation.isPending

    const handleSubmit = async (values: LocationFormValues) => {
        try {
            const payload = {
                name: values.name.trim(),
                acronym: values.acronym?.trim() ? values.acronym.trim() : null,
                state: values.state?.trim() ? values.state.trim() : null,
                region: values.region?.trim() ? values.region.trim() : null,
                status: values.status,
            }

            if (isEdit && location) {
                await updateLocation.mutateAsync({ id: location.id, data: payload as any })
            } else {
                await createLocation.mutateAsync(payload as any)
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
                    <SheetTitle>{isEdit ? 'Edit Location' : 'Create Location'}</SheetTitle>
                    <SheetDescription>
                        {isEdit ? 'Update location details' : 'Add a new location to the system'}
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6 px-1">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter location name" {...field} />
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
                            name="state"
                            label="State (optional)"
                            options={stateOptions}
                            placeholder="Select state"
                        />
                        <SelectField
                            control={form.control}
                            name="region"
                            label="Region (optional)"
                            options={regionOptions}
                            placeholder="Select region"
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
