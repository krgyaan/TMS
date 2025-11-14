import { useParams } from 'react-router-dom'
import { useOrganization } from '@/hooks/api/useOrganizations'
import { OrganizationForm } from './components/OrganizationForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const EditOrganizationPage = () => {
    const { id } = useParams<{ id: string }>()
    const orgId = Number(id)
    const { data, isLoading, error, refetch } = useOrganization(orgId)

    if (!orgId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Organization not found</CardTitle>
                    <CardDescription>Invalid organization identifier</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (isLoading) {
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

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Edit Organization</CardTitle>
                    <CardDescription>Update organization details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load organization. {error?.message}
                            <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    return <OrganizationForm mode="edit" organization={data} />
}

export default EditOrganizationPage
