import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { useCreateRole, useUpdateRole } from '@/hooks/api/useRoles';
import type { Role } from '@/types/api.types';
import { paths } from '@/app/routes/paths';
import { Checkbox } from '@/components/ui/checkbox';

// Schema
const RoleSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }).max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().default(true),
});

type RoleValues = z.infer<typeof RoleSchema>;

interface RoleFormProps {
    role?: Role;
    mode: 'create' | 'edit';
}

export function RoleForm({ role, mode }: RoleFormProps) {
    const navigate = useNavigate();
    const createRole = useCreateRole();
    const updateRole = useUpdateRole();

    const form = useForm<RoleValues>({
        resolver: zodResolver(RoleSchema),
        defaultValues: {
            name: '',
            description: '',
            status: true,
        },
    });

    // Populate form when editing
    useEffect(() => {
        if (role && mode === 'edit') {
            form.reset({
                name: role.name,
                description: role.description || '',
                status: role.status,
            });
        }
    }, [role, mode, form]);

    const onSubmit: SubmitHandler<RoleValues> = async (values) => {
        try {
            const emptyToUndef = (s: string | undefined) =>
                s && s.trim().length > 0 ? s : undefined;

            const payload = {
                name: values.name,
                description: emptyToUndef(values.description),
                status: values.status,
            };

            if (mode === 'create') {
                await createRole.mutateAsync(payload);
            } else if (role) {
                await updateRole.mutateAsync({ id: role.id, data: payload });
            }

            navigate(paths.master.roles);
        } catch (error) {
            console.error('Form submission error:', error);
        }
    };

    const saving = createRole.isPending || updateRole.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create Role' : 'Edit Role'}</CardTitle>
                <CardAction>
                    {role && mode === 'edit' ? (
                        <span className="text-sm text-muted-foreground">ID: {role.id}</span>
                    ) : null}
                </CardAction>
                <CardDescription>
                    {mode === 'create'
                        ? 'Add a new role to the system'
                        : 'Update role information'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldWrapper<RoleValues, 'name'>
                                control={form.control}
                                name="name"
                                label="Role Name"
                            >
                                {(field) => <Input placeholder="e.g., Administrator" {...field} />}
                            </FieldWrapper>

                            <FieldWrapper<RoleValues, 'description'>
                                control={form.control}
                                name="description"
                                label="Description"
                            >
                                {(field) => (
                                    <Input placeholder="Brief description of the role" {...field} />
                                )}
                            </FieldWrapper>

                            <FieldWrapper<RoleValues, 'status'>
                                control={form.control}
                                name="status"
                                label="Status"
                                description="Inactive roles cannot be assigned to users"
                            >
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <span className="text-sm">Active</span>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="flex items-center justify-center gap-2">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : mode === 'create' ? 'Create Role' : 'Update Role'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.master.roles)}
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
