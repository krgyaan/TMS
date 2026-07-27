import { useParams, useNavigate } from "react-router-dom";
import { EnquiryCostingViewPage } from "./EnquiryCostingViewPage";
import { paths } from "@/app/routes/paths";

export default function EnquiryCostingShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const costingId = id ? Number(id) : null;

    if (!costingId || isNaN(costingId)) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Invalid costing ID</p>
            </div>
        );
    }

    return (
        <EnquiryCostingViewPage
            costingId={costingId}
            onBack={() => navigate(paths.crm.enquiryCostings)}
            backLabel="Back to Costings"
        />
    );
}
