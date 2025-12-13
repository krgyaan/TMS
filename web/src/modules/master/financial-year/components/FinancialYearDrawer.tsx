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
import { useCreateFinancialYear, useUpdateFinancialYear } from '@/hooks/api/useFinancialYear'
import type { FinancialYear } from '@/types/api.types'

const FinancialYearFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().default(true),
})

type FinancialYearFormValues = z.infer<typeof FinancialYearFormSchema>

type FinancialYearDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    financialYear?: FinancialYear | null
    onSuccess?: () => void
}

export const FinancialYearDrawer = ({
    open,
    onOpenChange,
    financialYear,
    onSuccess
}: FinancialYearDrawerProps) => {
    const createFinancialYear = useCreateFinancialYear()
    const updateFinancialYear = useUpdateFinancialYear()
    const isEdit = !!financialYear

    const form = useForm<FinancialYearFormValues>({
        resolver: zodResolver(FinancialYearFormSchema) as any,
        defaultValues: {
            name: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && financialYear) {
            form.reset({
                name: financialYear.name || '',
                status: financialYear.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                status: true,
            })
        }
    }, [form, isEdit, financialYear, open])

    const saving = createFinancialYear.isPending || updateFinancialYear.isPending

    const handleSubmit = async (values: FinancialYearFormValues) => {
        try {
            if (isEdit && financialYear) {
                await updateFinancialYear.mutateAsync({ id: financialYear.id, data: values })
            } else {
                await createFinancialYear.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit Financial Year' : 'Create Financial Year'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update financial year details'
                            : 'Add a new financial year to the system'}
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
                                        <Input placeholder="Enter financial year (e.g., 2024-2025)" {...field} />
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
