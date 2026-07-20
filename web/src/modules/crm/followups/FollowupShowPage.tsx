import { useParams, useNavigate } from "react-router-dom";
import { FollowupViewPage } from "./FollowupViewPage";
import { paths } from "@/app/routes/paths";

export default function FollowupShowPage() {
    const { leadId } = useParams<{ leadId: string }>();
    const navigate = useNavigate();
    const leadIdNum = leadId ? Number(leadId) : null;

    if (!leadIdNum || isNaN(leadIdNum)) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Invalid lead ID</p>
            </div>
        );
    }

    return (
        <FollowupViewPage
            leadId={leadIdNum}
            onBack={() => navigate(paths.crm.leadFollowup(leadIdNum))}
            backLabel="Back to Add Follow-up"
        />
    );
}