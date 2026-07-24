import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEnquiryCosting } from "@/hooks/api/useEnquiryCosting";

const EnquiryCostingViewPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: costing, isLoading } = useEnquiryCosting(id ? Number(id) : null);

    if (isLoading) return <div>Loading...</div>;
    if (!costing) return <div>Costing not found</div>;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle>Costing Sheet Details - {costing.enqName}</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <pre className="text-sm">{JSON.stringify(costing, null, 2)}</pre>
            </CardContent>
        </Card>
    );
};

export default EnquiryCostingViewPage;
