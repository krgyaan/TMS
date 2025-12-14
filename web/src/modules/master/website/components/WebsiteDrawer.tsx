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
import { useCreateWebsite, useUpdateWebsite } from '@/hooks/api/useWebsites'
import type { Website } from '@/types/api.types'

const WebsiteFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
    status: z.boolean().default(true),
})

type WebsiteFormValues = z.infer<typeof WebsiteFormSchema>

type WebsiteDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    website?: Website | null
    onSuccess?: () => void
}

export const WebsiteDrawer = ({
    open,
    onOpenChange,
    website,
    onSuccess
}: WebsiteDrawerProps) => {
    const createWebsite = useCreateWebsite()
    const updateWebsite = useUpdateWebsite()
    const isEdit = !!website

    const form = useForm<WebsiteFormValues>({
        resolver: zodResolver(WebsiteFormSchema) as any,
        defaultValues: {
            name: '',
            url: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && website) {
            form.reset({
                name: website.name || '',
                url: website.url || '',
                status: website.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                url: '',
                status: true,
            })
        }
    }, [form, isEdit, website, open])

    const saving = createWebsite.isPending || updateWebsite.isPending

    const handleSubmit = async (values: WebsiteFormValues) => {
        try {
            if (isEdit && website) {
                await updateWebsite.mutateAsync({ id: website.id, data: values })
            } else {
                await createWebsite.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit Website' : 'Create Website'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update website details'
                            : 'Add a new website to the system'}
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
                                        <Input placeholder="Enter website name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="https://example.com"
                                            type="url"
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
