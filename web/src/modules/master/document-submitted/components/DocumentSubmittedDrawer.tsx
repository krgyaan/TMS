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
import { useCreateDocumentSubmitted, useUpdateDocumentSubmitted } from '@/hooks/api/useDocumentsSubmitted'
import type { DocumentSubmitted } from '@/types/api.types'

const DocumentSubmittedFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().default(true),
})

type DocumentSubmittedFormValues = z.infer<typeof DocumentSubmittedFormSchema>

type DocumentSubmittedDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    documentSubmitted?: DocumentSubmitted | null
    onSuccess?: () => void
}

export const DocumentSubmittedDrawer = ({
    open,
    onOpenChange,
    documentSubmitted,
    onSuccess
}: DocumentSubmittedDrawerProps) => {
    const createDocumentSubmitted = useCreateDocumentSubmitted()
    const updateDocumentSubmitted = useUpdateDocumentSubmitted()
    const isEdit = !!documentSubmitted

    const form = useForm<DocumentSubmittedFormValues>({
        resolver: zodResolver(DocumentSubmittedFormSchema),
        defaultValues: {
            name: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && documentSubmitted) {
            form.reset({
                name: documentSubmitted.name || '',
                status: documentSubmitted.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                status: true,
            })
        }
    }, [form, isEdit, documentSubmitted, open])

    const saving = createDocumentSubmitted.isPending || updateDocumentSubmitted.isPending

    const handleSubmit = async (values: DocumentSubmittedFormValues) => {
        try {
            if (isEdit && documentSubmitted) {
                await updateDocumentSubmitted.mutateAsync({ id: documentSubmitted.id, data: values })
            } else {
                await createDocumentSubmitted.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit Document Type' : 'Create Document Type'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update document type details'
                            : 'Add a new document type to the system'}
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
                                        <Input placeholder="Enter document type name" {...field} />
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
