import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import InventoryItemForm from "./components/InventoryItemForm";

export default function InventoryItemCreatePage() {
    const { canCreate } = useAuth();

    if (!canCreate("master.item-master")) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        You don&apos;t have permission to create item master records.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return <InventoryItemForm mode="create" />;
}
