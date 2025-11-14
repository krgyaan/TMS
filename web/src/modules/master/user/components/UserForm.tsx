import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { FieldWrapper } from '@/components/form/FieldWrapper'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft } from 'lucide-react'
import { paths } from '@/app/routes/paths'
import { useCreateUser, useUpdateUser } from '@/hooks/api/useUsers'
import { useCreateUserProfile, useUpdateUserProfile } from '@/hooks/api/useUserProfiles'
import { useTeams } from '@/hooks/api/useTeams'
import { useDesignations } from '@/hooks/api/useDesignations'
import { SelectField } from '@/components/form/SelectField'
import type { User, CreateUserDto, UpdateUserDto, UserProfile } from '@/types/api.types'

const preprocessText = (value: unknown) => {
    if (typeof value !== 'string') {
        return value
    }
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
}

const optionalString = (max: number, message: string) =>
    z.preprocess(preprocessText, z.string().max(max, message)).optional()

const optionalEmail = () =>
    z.preprocess(preprocessText, z.string().email('Invalid email address')).optional()

const ProfileSchema = z.object({
    firstName: optionalString(255, 'First name too long'),
    lastName: optionalString(255, 'Last name too long'),
    dateOfBirth: optionalString(50, 'Invalid date'),
    gender: optionalString(20, 'Gender too long'),
    employeeCode: optionalString(50, 'Employee code too long'),
    designationId: optionalString(20, 'Designation is not valid'),
    primaryTeamId: optionalString(20, 'Team is not valid'),
    altEmail: optionalEmail(),
    emergencyContactName: optionalString(255, 'Contact name too long'),
    emergencyContactPhone: optionalString(20, 'Contact phone too long'),
    image: optionalString(255, 'Image path too long'),
    signature: optionalString(255, 'Signature path too long'),
    dateOfJoining: optionalString(50, 'Invalid date'),
    dateOfExit: optionalString(50, 'Invalid date'),
    timezone: optionalString(50, 'Timezone too long'),
    locale: optionalString(10, 'Locale too long'),
})

const PROFILE_DEFAULTS = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    employeeCode: '',
    designationId: '',
    primaryTeamId: '',
    altEmail: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    image: '',
    signature: '',
    dateOfJoining: '',
    dateOfExit: '',
    timezone: 'Asia/Kolkata',
    locale: 'en',
}

const UserFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    username: optionalString(100, 'Username too long').nullable(),
    mobile: optionalString(20, 'Mobile number too long').nullable(),
    password: z
        .string()
        .max(255)
        .optional()
        .refine((val) => !val || val.length >= 6, {
            message: 'Password must be at least 6 characters',
        }),
    isActive: z.boolean().default(true),
    profile: ProfileSchema,
})

type UserFormValues = z.infer<typeof UserFormSchema>

type UserFormProps = {
    mode: 'create' | 'edit'
    user?: User
}

export const UserForm = ({ mode, user }: UserFormProps) => {
    const navigate = useNavigate()
    const createUser = useCreateUser()
    const updateUser = useUpdateUser()
    const createProfile = useCreateUserProfile()
    const updateProfile = useUpdateUserProfile()
    const { data: teams = [] } = useTeams()
    const { data: designations = [] } = useDesignations()

    const form = useForm<UserFormValues>({
        resolver: zodResolver(UserFormSchema),
        defaultValues: {
            name: '',
            email: '',
            username: '',
            mobile: '',
            password: '',
            isActive: true,
            profile: { ...PROFILE_DEFAULTS },
        },
    })

    useEffect(() => {
        if (mode === 'edit' && user) {
            form.reset({
                name: user.name || '',
                email: user.email || '',
                username: user.username || '',
                mobile: user.mobile || '',
                password: '',
                isActive: user.isActive ?? true,
                profile: {
                    ...PROFILE_DEFAULTS,
                    firstName: user.profile?.firstName ?? '',
                    lastName: user.profile?.lastName ?? '',
                    dateOfBirth: user.profile?.dateOfBirth ?? '',
                    gender: user.profile?.gender ?? '',
                    employeeCode: user.profile?.employeeCode ?? '',
                    designationId: user.profile?.designationId ? String(user.profile.designationId) : '',
                    primaryTeamId: user.profile?.primaryTeamId ? String(user.profile.primaryTeamId) : '',
                    altEmail: user.profile?.altEmail ?? '',
                    emergencyContactName: user.profile?.emergencyContactName ?? '',
                    emergencyContactPhone: user.profile?.emergencyContactPhone ?? '',
                    image: user.profile?.image ?? '',
                    signature: user.profile?.signature ?? '',
                    dateOfJoining: user.profile?.dateOfJoining ?? '',
                    dateOfExit: user.profile?.dateOfExit ?? '',
                    timezone: user.profile?.timezone ?? PROFILE_DEFAULTS.timezone,
                    locale: user.profile?.locale ?? PROFILE_DEFAULTS.locale,
                },
            })
        }
    }, [form, mode, user])

    const teamOptions = useMemo(
        () => [
            { id: '', name: 'None' },
            ...teams.map((team) => ({ id: String(team.id), name: team.name })),
        ],
        [teams],
    )

    const designationOptions = useMemo(
        () => [
            { id: '', name: 'None' },
            ...designations.map((designation) => ({ id: String(designation.id), name: designation.name })),
        ],
        [designations],
    )

    const hasProfileData = (profile: UserFormValues['profile']) => {
        return Object.entries(profile).some(([key, value]) => {
            if (value == null) {
                return false
            }
            if (typeof value === 'string') {
                const normalized = value.trim()
                if (!normalized.length) {
                    return false
                }
                if (key === 'timezone' && normalized === PROFILE_DEFAULTS.timezone) {
                    return false
                }
                if (key === 'locale' && normalized === PROFILE_DEFAULTS.locale) {
                    return false
                }
                return true
            }
            return true
        })
    }

    const mapProfilePayload = (
        profile: UserFormValues['profile'],
        userId: number,
    ): Omit<UserProfile, 'id'> => {
        const payload: Omit<UserProfile, 'id'> = {
            userId,
            firstName: profile.firstName ?? null,
            lastName: profile.lastName ?? null,
            dateOfBirth: profile.dateOfBirth ?? null,
            gender: profile.gender ?? null,
            employeeCode: profile.employeeCode ?? null,
            designationId: profile.designationId ? Number(profile.designationId) : null,
            primaryTeamId: profile.primaryTeamId ? Number(profile.primaryTeamId) : null,
            altEmail: profile.altEmail ?? null,
            emergencyContactName: profile.emergencyContactName ?? null,
            emergencyContactPhone: profile.emergencyContactPhone ?? null,
            image: profile.image ?? null,
            signature: profile.signature ?? null,
            dateOfJoining: profile.dateOfJoining ?? null,
            dateOfExit: profile.dateOfExit ?? null,
            timezone: profile.timezone ?? null,
            locale: profile.locale ?? null,
        }

        return payload
    }

    const handleSubmit = async (values: UserFormValues) => {
        if (mode === 'create' && !values.password) {
            form.setError('password', { type: 'manual', message: 'Password is required' })
            return
        }

        const basePayload: Omit<CreateUserDto, 'password'> & { password?: string } = {
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            username: values.username?.trim() ? values.username.trim() : null,
            mobile: values.mobile?.trim() ? values.mobile.trim() : null,
            isActive: values.isActive,
        }

        if (values.password) {
            basePayload.password = values.password
        }

        const profilePayload = (userId: number) => mapProfilePayload(values.profile, userId)
        const shouldPersistProfile = hasProfileData(values.profile)

        if (mode === 'create') {
            const createdUser = await createUser.mutateAsync(basePayload as CreateUserDto)
            if (createdUser?.id && shouldPersistProfile) {
                await createProfile.mutateAsync(profilePayload(createdUser.id))
            }
        } else if (user) {
            await updateUser.mutateAsync({ id: user.id, data: basePayload as UpdateUserDto })
            if (shouldPersistProfile) {
                if (user.profile) {
                    await updateProfile.mutateAsync({
                        userId: user.id,
                        data: profilePayload(user.id),
                    })
                } else {
                    await createProfile.mutateAsync(profilePayload(user.id))
                }
            }
        }

        navigate(paths.master.users)
    }

    const saving =
        createUser.isPending ||
        updateUser.isPending ||
        createProfile.isPending ||
        updateProfile.isPending

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create User' : 'Edit User'}</CardTitle>
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
                        <div className="grid gap-6 md:grid-cols-2">
                            <FieldWrapper control={form.control} name="name" label="Full Name">
                                {(field) => <Input placeholder="Enter full name" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="email" label="Email">
                                {(field) => <Input type="email" placeholder="name@company.com" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="username" label="Username (optional)">
                                {(field) => <Input placeholder="Username" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="mobile" label="Mobile (optional)">
                                {(field) => <Input placeholder="Phone number" {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="password" label="Password">
                                {(field) => (
                                    <Input
                                        type="password"
                                        placeholder={mode === 'edit' ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                                        {...field}
                                    />
                                )}
                            </FieldWrapper>
                        </div>

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
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) => field.onChange(checked === true)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 rounded-md border p-4">
                            <div>
                                <p className="text-sm font-semibold">Profile Details</p>
                                <p className="text-xs text-muted-foreground">
                                    Provide optional profile details, team assignments, and contact information.
                                </p>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <FieldWrapper control={form.control} name="profile.firstName" label="First Name">
                                    {(field) => <Input placeholder="First name" {...field} value={field.value ?? ''} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="profile.lastName" label="Last Name">
                                    {(field) => <Input placeholder="Last name" {...field} value={field.value ?? ''} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="profile.employeeCode" label="Employee Code">
                                    {(field) => <Input placeholder="EMP-001" {...field} value={field.value ?? ''} />}
                                </FieldWrapper>
                                <SelectField
                                    control={form.control}
                                    name="profile.designationId"
                                    label="Designation"
                                    options={designationOptions}
                                    placeholder="Select designation"
                                />
                                <SelectField
                                    control={form.control}
                                    name="profile.primaryTeamId"
                                    label="Primary Team"
                                    options={teamOptions}
                                    placeholder="Select team"
                                />
                                <FieldWrapper control={form.control} name="profile.altEmail" label="Alternate Email">
                                    {(field) => <Input type="email" placeholder="example@company.com" {...field} value={field.value ?? ''} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="profile.emergencyContactName" label="Emergency Contact Name">
                                    {(field) => <Input placeholder="Jane Doe" {...field} value={field.value ?? ''} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="profile.emergencyContactPhone" label="Emergency Contact Phone">
                                    {(field) => <Input placeholder="+91 90000 00000" {...field} value={field.value ?? ''} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="profile.timezone" label="Timezone">
                                    {(field) => <Input placeholder="Asia/Kolkata" {...field} value={field.value ?? ''} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="profile.locale" label="Locale">
                                    {(field) => <Input placeholder="en" {...field} value={field.value ?? ''} />}
                                </FieldWrapper>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={saving}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
