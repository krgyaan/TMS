import { useParams } from "react-router-dom";
import { useItem } from "@/hooks/api/useItems";
import { ItemModal } from "./components/ItemModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

const EditItemPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const itemId = Number(id);
    const { data, isLoading, error, refetch } = useItem(itemId);
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (!open) {
            navigate(paths.master.items);
        }
    }, [open, navigate]);

    if (!itemId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Item not found</CardTitle>
                    <CardDescription>Invalid item identifier</CardDescription>
                </CardHeader>
            </Card>
        );
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
        );
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
        );
    }

    return <ItemDrawer open={open} onOpenChange={setOpen} item={data} onSuccess={() => navigate(paths.master.items)} />;
};

export default EditItemPage;
