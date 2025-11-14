import { useParams } from 'react-router-dom'
import { useItem } from '@/hooks/api/useItems'
import { ItemForm } from './components/ItemForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const EditItemPage = () => {
    const { id } = useParams<{ id: string }>()
    const itemId = Number(id)
    const { data, isLoading, error, refetch } = useItem(itemId)

    if (!itemId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Item not found</CardTitle>
                    <CardDescription>Invalid item identifier</CardDescription>
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
                    <CardTitle>Edit Item</CardTitle>
                    <CardDescription>Update item details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load item. {error?.message}
                            <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    return <ItemForm mode="edit" item={data} />
}

export default EditItemPage
