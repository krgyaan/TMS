import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useCreateUser } from "@/hooks/api/useUsers";
import { useRoles } from "@/hooks/api/useRoles";
import { useTeams } from "@/hooks/api/useTeams";
import type { CreateUserDto } from "@/types/api.types";
import { usersService } from "@/services/api/users.service";

const UserCreateFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    username: z.string().min(1, "Username is required"),
    mobile: z.string().min(1, "Mobile number is required").max(20, "Mobile number too long"),
    password: z.string().min(6, "Password must be at least 6 characters").max(255),
    teamId: z.string().min(1, "Team is required"),
    subTeamId: z.string().optional(),
    roleId: z.string().min(1, "Role is required"),
    isActive: z.boolean().default(true),
});

type UserCreateFormValues = z.infer<typeof UserCreateFormSchema>;

export default function UserCreateForm() {
    const navigate = useNavigate();
    const createUser = useCreateUser();
    const { data: roles = [] } = useRoles();
    const { data: primaryTeams = [] } = useTeams({ category: 'primary' });
    const { data: secondaryTeams = [] } = useTeams({ category: 'secondary' });
    const [showPassword, setShowPassword] = useState(false);
    const [expectedCode, setExpectedCode] = useState("");
    const emailDebounceRef = useRef<ReturnType<typeof setTimeout>>();

    const form = useForm<UserCreateFormValues>({
        resolver: zodResolver(UserCreateFormSchema) as any,
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            username: "",
            mobile: "",
            password: "",
            teamId: "",
            subTeamId: "",
            roleId: "",
            isActive: true,
        },
    });

    // Fetch next employee code on mount
    useEffect(() => {
        usersService.getGenerateInfo().then(res => {
            if (res?.employeeCode) setExpectedCode(res.employeeCode);
        });
    }, []);

    const fetchUsernameSuggestion = useCallback(
        (email: string) => {
            const prefix = email.split("@")[0];
            if (!prefix) return;
            usersService.getGenerateInfo(email).then(res => {
                if (res?.username) {
                    form.setValue("username", res.username, { shouldValidate: true });
                }
            });
        },
        [form]
    );

    const handleEmailChange = useCallback(
        (email: string) => {
            const prefix = email.split("@")[0];
            // Immediate fill with raw prefix
            form.setValue("username", prefix, { shouldValidate: true });
            // Debounced check for uniqueness
            if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
            if (prefix) {
                emailDebounceRef.current = setTimeout(() => fetchUsernameSuggestion(email), 500);
            }
        },
        [form, fetchUsernameSuggestion]
    );

    const handleSubmit = async (values: UserCreateFormValues) => {
        const payload: CreateUserDto = {
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            email: values.email.trim().toLowerCase(),
            username: values.username.trim(),
            mobile: values.mobile.trim(),
            password: values.password,
            teamId: Number(values.teamId),
            subTeamId: values.subTeamId ? Number(values.subTeamId) : null,
            roleId: Number(values.roleId),
            isActive: values.isActive,
        };

        const createdUser = await createUser.mutateAsync(payload);
        navigate(paths.master.users_permissions(createdUser.id));
    };

    const teamOptions = useMemo(
        () => primaryTeams.map(t => ({ id: String(t.id), name: t.name })),
        [primaryTeams]
    );

    const subTeamOptions = useMemo(
        () => secondaryTeams.map(t => ({ id: String(t.id), name: t.name })),
        [secondaryTeams]
    );

    const roleOptions = useMemo(
        () => roles.map(r => ({ id: String(r.id), name: r.name })),
        [roles]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create User</CardTitle>
                <CardDescription>Fill in the details to create a new employee account.</CardDescription>
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
                        {/* Personal Details */}
                        <div className="space-y-4 rounded-md border p-4">
                            <div>
                                <p className="text-sm font-semibold">Personal Details</p>
                                <p className="text-xs text-muted-foreground">Basic information about the employee.</p>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <FieldWrapper control={form.control} name="firstName" label="First Name">
                                    {field => <Input placeholder="John" {...(field as any)} value={field.value ?? ""} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="lastName" label="Last Name">
                                    {field => <Input placeholder="Doe" {...(field as any)} value={field.value ?? ""} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="email" label="Email">
                                    {field => (
                                        <Input
                                            type="email"
                                            placeholder="john@company.com"
                                            {...(field as any)}
                                            value={field.value ?? ""}
                                            onChange={e => {
                                                field.onChange(e);
                                                handleEmailChange(e.target.value);
                                            }}
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="username" label="Username">
                                    {field => <Input placeholder="Auto-filled from email" {...(field as any)} value={field.value ?? ""} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="mobile" label="Mobile">
                                    {field => <Input placeholder="Phone number" {...(field as any)} value={field.value ?? ""} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="password" label="Password">
                                    {field => (
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Minimum 6 characters"
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
                            </div>
                        </div>

                        {/* Employee Details */}
                        <div className="space-y-4 rounded-md border p-4">
                            <div>
                                <p className="text-sm font-semibold">Employee Details</p>
                                <p className="text-xs text-muted-foreground">Employment information including team and role.</p>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Employee Code</label>
                                    <Input value={expectedCode || "Fetching..."} disabled className="text-muted-foreground" />
                                </div>
                                <SelectField
                                    control={form.control}
                                    name="teamId"
                                    label="Team"
                                    options={teamOptions}
                                    placeholder="Select a team"
                                />
                                <SelectField
                                    control={form.control}
                                    name="subTeamId"
                                    label="Sub-team"
                                    options={subTeamOptions}
                                    placeholder="Select sub-team"
                                />
                                <SelectField
                                    control={form.control}
                                    name="roleId"
                                    label="Role"
                                    options={roleOptions}
                                    placeholder="Select a role"
                                />
                            </div>
                        </div>

                        {/* Status */}
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

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => form.reset()}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={createUser.isPending}>
                                {createUser.isPending ? "Creating..." : "Create User"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}