import { useParams } from 'react-router-dom'
import { useVendor } from '@/hooks/api/useVendors'
import { VendorDrawer } from './components/VendorDrawer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'

const EditVendorPage = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const vendorId = Number(id)
    const { data, isLoading, error, refetch } = useVendor(vendorId)
    const [open, setOpen] = useState(true)

    useEffect(() => {
        if (!open) {
            navigate(paths.master.vendors)
        }
    }, [open, navigate])

    if (!vendorId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vendor not found</CardTitle>
                    <CardDescription>Invalid vendor identifier</CardDescription>
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
                    <CardTitle>Edit Vendor</CardTitle>
                    <CardDescription>Update vendor details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load vendor. {error?.message}
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
        <VendorDrawer
            open={open}
            onOpenChange={setOpen}
            vendor={data}
            onSuccess={() => navigate(paths.master.vendors)}
        />
    )
}

export default EditVendorPage
