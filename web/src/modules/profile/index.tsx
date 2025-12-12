import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { useUserProfile, useUpdateUserProfile } from '@/hooks/api/useUserProfiles'
import { ProfileForm } from './components/ProfileForm'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function ProfilePage() {
    const { data: currentUser, isLoading: userLoading } = useCurrentUser()
    const userId = currentUser?.id
    const { data: profile, isLoading: profileLoading, refetch } = useUserProfile(userId)
    const updateProfile = useUpdateUserProfile()
    const [isEditing, setIsEditing] = useState(false)

    if (userLoading || profileLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (!currentUser) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>User not found</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Unable to load user information. Please try again.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>My Profile</CardTitle>
                        <CardDescription>Manage your profile information</CardDescription>
                    </div>
                    {!isEditing && (
                        <Button onClick={() => setIsEditing(true)}>
                            Edit Profile
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <ProfileForm
                        user={currentUser}
                        profile={profile}
                        onCancel={() => setIsEditing(false)}
                        onSuccess={() => {
                            setIsEditing(false)
                            refetch()
                        }}
                    />
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                <p className="text-sm">{currentUser.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <p className="text-sm">{currentUser.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Username</label>
                                <p className="text-sm">{currentUser.username || '—'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Mobile</label>
                                <p className="text-sm">{currentUser.mobile || '—'}</p>
                            </div>
                        </div>
                        {profile && (
                            <div className="border-t pt-6">
                                <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {profile.firstName && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">First Name</label>
                                            <p className="text-sm">{profile.firstName}</p>
                                        </div>
                                    )}
                                    {profile.lastName && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                                            <p className="text-sm">{profile.lastName}</p>
                                        </div>
                                    )}
                                    {profile.employeeCode && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Employee Code</label>
                                            <p className="text-sm">{profile.employeeCode}</p>
                                        </div>
                                    )}
                                    {profile.altEmail && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Alternate Email</label>
                                            <p className="text-sm">{profile.altEmail}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
