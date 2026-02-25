import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useCreateUser, useUpdateUser } from "@/hooks/api/useUsers";
import { useRoles } from "@/hooks/api/useRoles";
import { usePermissions } from "@/hooks/api/usePermissions";
import { useUserRole, useAssignUserRole, useUpdateUserRole } from "@/hooks/api/useUserRoles";
import { useUserPermissions, useAssignUserPermissions, useUpdateUserPermissions } from "@/hooks/api/useUserPermissions";
import { PermissionSelector } from "@/components/PermissionSelector";
import { rolesService } from "@/services/api/role.service";
import type { User, CreateUserDto, UpdateUserDto, Permission, UserPermission } from "@/types/api.types";
import type { UserRole } from "@/types/auth.types";



const UserFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email"),
    username: z.string().optional().nullable().refine(val => !val || val.length <= 100, {
        message: "Username must be at most 100 characters",
    }),
    mobile: z.string().optional().nullable().refine(val => !val || val.length <= 20, {
        message: "Mobile number must be at most 20 characters",
    }),
    password: z.string().max(255).optional().refine(val => !val || val.length >= 6, {
        message: "Password must be at least 6 characters",
    }),
    isActive: z.boolean().default(true),
    roleId: z.number().int().positive("Role is required").optional(),
});

type UserFormValues = z.infer<typeof UserFormSchema>;

type UserFormProps = {
    mode: "create" | "edit";
    user?: User;
};

export const UserForm = ({ mode, user }: UserFormProps) => {
    const navigate = useNavigate();
    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const { data: roles = [] } = useRoles();
    const { data: allPermissions = [] } = usePermissions();
    const assignRole = useAssignUserRole();
    const updateRole = useUpdateUserRole();
    const assignPermissions = useAssignUserPermissions();
    const updatePermissions = useUpdateUserPermissions();
    const [showPassword, setShowPassword] = useState<boolean>(false);

    // State for role and permissions
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<Map<number, boolean>>(new Map());

    // Load user role and permissions in edit mode
    const { data: userRole } = useUserRole(mode === "edit" && user ? user.id : null);
    const { data: userPermissionsData } = useUserPermissions(mode === "edit" && user ? user.id : null);

    // Load role permissions when role is selected
    useEffect(() => {
        if (selectedRoleId) {
            rolesService
                .getRolePermissions(Number(selectedRoleId))
                .then(perms => setRolePermissions(perms))
                .catch(() => setRolePermissions([]));
        } else {
            setRolePermissions([]);
        }
    }, [selectedRoleId]);

    // Initialize role and permissions in edit mode
    useEffect(() => {
        if (mode === "edit" && user) {
            if (userRole) {
                setSelectedRoleId(String((userRole as UserRole).id));
            }
            if (userPermissionsData && Array.isArray(userPermissionsData)) {
                const permMap = new Map<number, boolean>();
                userPermissionsData.forEach((up: UserPermission) => {
                    permMap.set(up.permissionId, up.granted);
                });
                setSelectedPermissions(permMap);
            }
        }
    }, [mode, user, userRole, userPermissionsData]);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(UserFormSchema) as any,
        defaultValues: {
            name: "",
            email: "",
            username: "",
            mobile: "",
            password: "",
            isActive: true,
        },
    });

    useEffect(() => {
        if (mode === "edit" && user) {
            form.reset({
                name: user.name || "",
                email: user.email || "",
                username: user.username || "",
                mobile: user.mobile || "",
                password: "",
                isActive: user.isActive ?? true,
            });
        }
    }, [form, mode, user]);

    const roleOptions = useMemo(() => [{ id: "", name: "None" }, ...roles.map(role => ({ id: String(role.id), name: role.name }))], [roles]);


    const handlePermissionChange = (permissionId: number, granted: boolean) => {
        setSelectedPermissions(prev => {
            const next = new Map(prev);
            if (granted) {
                next.set(permissionId, true);
            } else {
                // If it's an inherited permission, we need to explicitly deny it
                // Otherwise, remove it
                const isInherited = rolePermissions.some(p => p.id === permissionId);
                if (isInherited) {
                    next.set(permissionId, false);
                } else {
                    next.delete(permissionId);
                }
            }
            return next;
        });
    };



    const handleSubmit = async (values: UserFormValues) => {
        let userId: number;

        if (mode === "create" && !values.password) {
            form.setError("password", { type: "manual", message: "Password is required" });
            return;
        }

        if (mode === "create" && !selectedRoleId) {
            form.setError("roleId", { type: "manual", message: "Role is required" });
            return;
        }

        const basePayload: Omit<CreateUserDto, "password" | "roleId"> & { password?: string; roleId?: number } = {
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            username: values.username?.trim() ? values.username.trim() : null,
            mobile: values.mobile?.trim() ? values.mobile.trim() : null,
            isActive: values.isActive,
        };

        if (values.password) {
            basePayload.password = values.password;
        }

        if (mode === "create" && selectedRoleId) {
            basePayload.roleId = Number(selectedRoleId);
        }

        if (mode === "create") {
            const createdUser = await createUser.mutateAsync(basePayload as CreateUserDto);
            userId = createdUser.id;

            // Role is already assigned in backend, but assign permissions if any are selected
            if (selectedPermissions.size > 0) {
                const permissionsArray = Array.from(selectedPermissions.entries()).map(([permissionId, granted]) => ({
                    permissionId,
                    granted,
                }));
                await assignPermissions.mutateAsync({
                    userId,
                    data: { permissions: permissionsArray },
                });
            }
        } else if (user) {
            userId = user.id;
            await updateUser.mutateAsync({ id: userId, data: basePayload as UpdateUserDto });

            // Update role if changed
            if (selectedRoleId && Number(selectedRoleId) !== userRole?.id) {
                await updateRole.mutateAsync({
                    userId,
                    data: { roleId: Number(selectedRoleId) },
                });
            }

            // Update permissions if changed
            if (selectedPermissions.size > 0) {
                const permissionsArray = Array.from(selectedPermissions.entries()).map(([permissionId, granted]) => ({
                    permissionId,
                    granted,
                }));
                await updatePermissions.mutateAsync({
                    userId,
                    data: { permissions: permissionsArray },
                });
            }
        } else {
            return;
        }

        navigate(paths.master.users);
    };

    const saving =
        createUser.isPending ||
        updateUser.isPending ||
        assignRole.isPending ||
        updateRole.isPending ||
        assignPermissions.isPending ||
        updatePermissions.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === "create" ? "Create User" : "Edit User"}</CardTitle>
                <CardDescription>Manage employee accounts and access</CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.master.users)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to list
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-3">
                            <FieldWrapper control={form.control} name="name" label="Full Name">
                                {field => <Input placeholder="Enter full name" {...(field as any)} value={field.value ?? ""} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="email" label="Email">
                                {field => <Input type="email" placeholder="name@company.com" {...(field as any)} value={field.value ?? ""} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="username" label="Username (optional)">
                                {field => <Input placeholder="Username" {...(field as any)} value={field.value ?? ""} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="mobile" label="Mobile (optional)">
                                {field => <Input placeholder="Phone number" {...(field as any)} value={field.value ?? ""} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="password" label="Password">
                                {field => (
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={mode === "edit" ? "Leave blank to keep current password" : "Minimum 6 characters"}
                                            {...(field as any)}
                                            value={field.value ?? ""}
                                            className="pr-10"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                )}
                            </FieldWrapper>
                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Active</FormLabel>
                                            <FormDescription>Inactive users cannot sign in.</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={checked => field.onChange(checked === true)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>


                        <div className="space-y-4 rounded-md border p-4">
                            <div>
                                <p className="text-sm font-semibold">Role & Permissions</p>
                                <p className="text-xs text-muted-foreground">Assign a role and customize permissions for this user.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Role <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedRoleId}
                                        onChange={e => setSelectedRoleId(e.target.value)}
                                        disabled={saving}
                                        required={mode === "create"}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">{mode === "create" ? "Select a role" : "None"}</option>
                                        {roleOptions
                                            .filter(opt => opt.id !== "")
                                            .map(option => (
                                                <option key={option.id} value={option.id}>
                                                    {option.name}
                                                </option>
                                            ))}
                                    </select>
                                    {form.formState.errors.roleId && <p className="text-sm text-red-500">{form.formState.errors.roleId.message}</p>}
                                </div>
                                {selectedRoleId && (
                                    <div className="mt-4">
                                        <p className="text-sm font-medium mb-2">Permissions</p>
                                        <p className="text-xs text-muted-foreground mb-4">
                                            Permissions inherited from role are shown with "(from role)" label. You can override them by checking/unchecking.
                                        </p>
                                        <PermissionSelector
                                            permissions={allPermissions}
                                            selectedPermissions={Array.from(selectedPermissions.entries())
                                                .map(([permissionId, granted]) => {
                                                    const perm = allPermissions.find(p => p.id === permissionId);
                                                    if (!perm) return null;
                                                    return {
                                                        id: 0,
                                                        permissionId,
                                                        module: perm.module,
                                                        action: perm.action,
                                                        description: perm.description ?? null,
                                                        granted,
                                                    } as UserPermission;
                                                })
                                                .filter((p): p is UserPermission => p !== null)}
                                            rolePermissions={rolePermissions}
                                            onChange={handlePermissionChange}
                                            disabled={saving}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>



                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={saving}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? "Saving..." : mode === "create" ? "Create User" : "Update User"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};
