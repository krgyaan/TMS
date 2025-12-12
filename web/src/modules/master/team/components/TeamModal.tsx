import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateTeam, useUpdateTeam } from '@/hooks/api/useTeams'
import type { Team } from '@/types/api.types'

const TeamFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().default(true),
})

type TeamFormValues = z.infer<typeof TeamFormSchema>

type TeamModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    team?: Team | null
    onSuccess?: () => void
}

export const TeamModal = ({ open, onOpenChange, team, onSuccess }: TeamModalProps) => {
    const createTeam = useCreateTeam()
    const updateTeam = useUpdateTeam()
    const isEdit = !!team

    const form = useForm<TeamFormValues>({
        resolver: zodResolver(TeamFormSchema),
        defaultValues: {
            name: '',
            description: '',
            status: true,
        },
    })

    useEffect(() => {
        if (isEdit && team) {
            form.reset({
                name: team.name || '',
                description: team.description || '',
                status: team.status ?? true,
            })
        } else {
            form.reset({
                name: '',
                description: '',
                status: true,
            })
        }
    }, [form, isEdit, team, open])

    const saving = createTeam.isPending || updateTeam.isPending

    const handleSubmit = async (values: TeamFormValues) => {
        try {
            if (isEdit && team) {
                await updateTeam.mutateAsync({ id: team.id, data: values })
            } else {
                await createTeam.mutateAsync(values)
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            // Error handling is done in the hook
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Team' : 'Create Team'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update team details' : 'Add a new team to the system'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter team name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter team description"
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
                        <DialogFooter>
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
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
