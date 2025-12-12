import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { FieldWrapper } from '@/components/form/FieldWrapper'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/form/SelectField'
import { useUpdateUserProfile, useCreateUserProfile } from '@/hooks/api/useUserProfiles'
import { useUpdateUser } from '@/hooks/api/useUsers'
import { useTeams } from '@/hooks/api/useTeams'
import { useDesignations } from '@/hooks/api/useDesignations'
import type { User } from '@/types/api.types'
import type { UserProfile } from '@/types/auth.types'
import { toast } from 'sonner'

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

const ProfileFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    username: optionalString(100, 'Username too long').nullable(),
    mobile: optionalString(20, 'Mobile number too long').nullable(),
    profile: ProfileSchema,
})

type ProfileFormValues = z.infer<typeof ProfileFormSchema>

type ProfileFormProps = {
    user: User
    profile?: UserProfile | null
    onCancel: () => void
    onSuccess: () => void
}

export const ProfileForm = ({ user, profile, onCancel, onSuccess }: ProfileFormProps) => {
    const updateUser = useUpdateUser()
    const updateProfile = useUpdateUserProfile()
    const createProfile = useCreateUserProfile()
    const { data: teams = [] } = useTeams()
    const { data: designations = [] } = useDesignations()

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(ProfileFormSchema),
        defaultValues: {
            name: user.name || '',
            username: user.username || '',
            mobile: user.mobile || '',
            profile: {
                firstName: profile?.firstName ?? '',
                lastName: profile?.lastName ?? '',
                dateOfBirth: profile?.dateOfBirth ?? '',
                gender: profile?.gender ?? '',
                employeeCode: profile?.employeeCode ?? '',
                designationId: profile?.designationId ? String(profile.designationId) : '',
                primaryTeamId: profile?.primaryTeamId ? String(profile.primaryTeamId) : '',
                altEmail: profile?.altEmail ?? '',
                emergencyContactName: profile?.emergencyContactName ?? '',
                emergencyContactPhone: profile?.emergencyContactPhone ?? '',
                image: profile?.image ?? '',
                signature: profile?.signature ?? '',
                dateOfJoining: profile?.dateOfJoining ?? '',
                dateOfExit: profile?.dateOfExit ?? '',
                timezone: profile?.timezone ?? 'Asia/Kolkata',
                locale: profile?.locale ?? 'en',
            },
        },
    })

    const teamOptions = [
        { id: '', name: 'None' },
        ...teams.map((team) => ({ id: String(team.id), name: team.name })),
    ]

    const designationOptions = [
        { id: '', name: 'None' },
        ...designations.map((designation) => ({ id: String(designation.id), name: designation.name })),
    ]

    const handleSubmit = async (values: ProfileFormValues) => {
        try {
            // Update user basic info
            await updateUser.mutateAsync({
                id: user.id,
                data: {
                    name: values.name.trim(),
                    username: values.username?.trim() || null,
                    mobile: values.mobile?.trim() || null,
                },
            })

            // Update or create profile
            const profilePayload = {
                userId: user.id,
                firstName: values.profile.firstName || null,
                lastName: values.profile.lastName || null,
                dateOfBirth: values.profile.dateOfBirth || null,
                gender: values.profile.gender || null,
                employeeCode: values.profile.employeeCode || null,
                designationId: values.profile.designationId ? Number(values.profile.designationId) : null,
                primaryTeamId: values.profile.primaryTeamId ? Number(values.profile.primaryTeamId) : null,
                altEmail: values.profile.altEmail || null,
                emergencyContactName: values.profile.emergencyContactName || null,
                emergencyContactPhone: values.profile.emergencyContactPhone || null,
                image: values.profile.image || null,
                signature: values.profile.signature || null,
                dateOfJoining: values.profile.dateOfJoining || null,
                dateOfExit: values.profile.dateOfExit || null,
                timezone: values.profile.timezone || null,
                locale: values.profile.locale || null,
            }

            if (profile) {
                await updateProfile.mutateAsync({
                    userId: user.id,
                    data: profilePayload,
                })
            } else {
                await createProfile.mutateAsync(profilePayload as any)
            }

            toast.success('Profile updated successfully')
            onSuccess()
        } catch (error) {
            console.error('Failed to update profile:', error)
            toast.error('Failed to update profile')
        }
    }

    const saving = updateUser.isPending || updateProfile.isPending || createProfile.isPending

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <FieldWrapper control={form.control} name="name" label="Full Name">
                        {(field) => <Input placeholder="Enter full name" {...field as any} value={field.value ?? ''} />}
                    </FieldWrapper>
                    <FieldWrapper control={form.control} name="username" label="Username (optional)">
                        {(field) => <Input placeholder="Username" {...field as any} value={field.value ?? ''} />}
                    </FieldWrapper>
                    <FieldWrapper control={form.control} name="mobile" label="Mobile (optional)">
                        {(field) => <Input placeholder="Phone number" {...field as any} value={field.value ?? ''} />}
                    </FieldWrapper>
                    <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input value={user.email} disabled className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                </div>

                <div className="space-y-4 rounded-md border p-4">
                    <div>
                        <p className="text-sm font-semibold">Profile Details</p>
                        <p className="text-xs text-muted-foreground">
                            Provide optional profile details and contact information.
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
                    <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
