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
import { useCreateState, useUpdateState } from '@/hooks/api/useStates'
import type { State } from '@/types/api.types'

const StateFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    code: z.string().max(10).optional(),
    status: z.boolean().default(true),
})

type StateFormValues = z.infer<typeof StateFormSchema>

type StateDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    state?: State | null
    onSuccess?: () => void
}

export const StateDrawer = ({ open, onOpenChange, state, onSuccess }: StateDrawerProps) => {
    const createState = useCreateState()
    const updateState = useUpdateState()
    const isEdit = !!state

    const form = useForm<StateFormValues>({
        resolver: zodResolver(StateFormSchema) as any,
        defaultValues: {
            name: '',
            code: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && state) {
            form.reset({
                name: state.name || '',
                code: state.code || '',
                status: state.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                code: '',
                status: true,
            })
        }
    }, [form, isEdit, state, open])

    const saving = createState.isPending || updateState.isPending

    const handleSubmit = async (values: StateFormValues) => {
        try {
            if (isEdit && state) {
                await updateState.mutateAsync({ id: state.id, data: values })
            } else {
                await createState.mutateAsync(values)
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
                    <SheetTitle>{isEdit ? 'Edit State' : 'Create State'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update state details'
                            : 'Add a new state to the system'}
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
                                        <Input placeholder="Enter state name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter state code (e.g., MH, UP)"
                                            maxLength={10}
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
