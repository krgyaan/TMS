import { useParams } from "react-router-dom";
import { EnquiryCostingDetailsSection } from "./EnquiryCostingViewPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EnquiryCostingShowPage() {
    const { id } = useParams<{ id: string }>();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Costing Sheet</CardTitle>
            </CardHeader>
            <CardContent>
                <EnquiryCostingDetailsSection costingId={id ? Number(id) : null} />
            </CardContent>
        </Card>
    );
}
