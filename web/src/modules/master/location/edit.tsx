import { useParams } from 'react-router-dom'
import { useLocation as useLocationQuery } from '@/hooks/api/useLocations'
import { LocationDrawer } from './components/LocationDrawer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'

const EditLocationPage = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const locationId = Number(id)
    const { data, isLoading, error, refetch } = useLocationQuery(locationId)
    const [open, setOpen] = useState(true)

    useEffect(() => {
        if (!open) {
            navigate(paths.master.locations)
        }
    }, [open, navigate])

    if (!locationId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Location not found</CardTitle>
                    <CardDescription>Invalid location identifier</CardDescription>
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
                    <CardTitle>Edit Location</CardTitle>
                    <CardDescription>Update location details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load location. {error?.message}
                            <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    return (
        <LocationDrawer
            open={open}
            onOpenChange={setOpen}
            location={data}
            onSuccess={() => navigate(paths.master.locations)}
        />
    )
}

export default EditLocationPage
