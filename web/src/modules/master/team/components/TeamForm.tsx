import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { useCreateTeam, useUpdateTeam } from '@/hooks/api/useTeams';
import type { Team } from '@/types/api.types';
import { paths } from '@/app/routes/paths';
import { Checkbox } from '@/components/ui/checkbox';

const TeamSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }).max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().default(true),
});

type TeamValues = z.infer<typeof TeamSchema>;

interface TeamFormProps {
    team?: Team;
    mode: 'create' | 'edit';
}

export function TeamForm({ team, mode }: TeamFormProps) {
    const navigate = useNavigate();
    const createTeam = useCreateTeam();
    const updateTeam = useUpdateTeam();

    const form = useForm<TeamValues>({
        resolver: zodResolver(TeamSchema),
        defaultValues: {
            name: '',
            description: '',
            status: true,
        },
    });

    useEffect(() => {
        if (team && mode === 'edit') {
            form.reset({
                name: team.name,
                description: team.description || '',
                status: team.status,
            });
        }
    }, [team, mode, form]);

    const onSubmit: SubmitHandler<TeamValues> = async (values) => {
        try {
            const emptyToUndef = (s: string | undefined) =>
                s && s.trim().length > 0 ? s : undefined;

            const payload = {
                name: values.name,
                description: emptyToUndef(values.description),
                status: values.status,
            };

            if (mode === 'create') {
                await createTeam.mutateAsync(payload);
            } else if (team) {
                await updateTeam.mutateAsync({ id: team.id, data: payload });
            }

            navigate(paths.master.teams);
        } catch (error) {
            console.error('Form error:', error);
        }
    };

    const saving = createTeam.isPending || updateTeam.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create Team' : 'Edit Team'}</CardTitle>
                <CardAction>
                    {team && mode === 'edit' ? (
                        <span className="text-sm text-muted-foreground">ID: {team.id}</span>
                    ) : null}
                </CardAction>
                <CardDescription>
                    {mode === 'create' ? 'Add a new team' : 'Update team information'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldWrapper<TeamValues, 'name'>
                                control={form.control}
                                name="name"
                                label="Team Name"
                            >
                                {(field) => <Input placeholder="e.g., Development Team" {...field} />}
                            </FieldWrapper>

                            <FieldWrapper<TeamValues, 'status'>
                                control={form.control}
                                name="status"
                                label="Status"
                            >
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        <span className="text-sm">Active</span>
                                    </div>
                                )}
                            </FieldWrapper>

                            <div className="md:col-span-2">
                                <FieldWrapper<TeamValues, 'description'>
                                    control={form.control}
                                    name="description"
                                    label="Description"
                                    description="Optional description of the team's responsibilities"
                                >
                                    {(field) => (
                                        <Textarea
                                            placeholder="Describe the team's purpose..."
                                            rows={4}
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-2">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : mode === 'create' ? 'Create Team' : 'Update Team'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.master.teams)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => form.reset()}
                                disabled={saving}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
