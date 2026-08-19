import { useParams, useNavigate } from "react-router-dom";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { paths } from "@/app/routes/paths";

export default function HappyCallingFollowupHistoryPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const happyCallingId = id ? Number(id) : null;

    if (!happyCallingId || isNaN(happyCallingId)) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Invalid Happy Calling ID</p>
            </div>
        );
    }

    return (
        <FollowupViewPage
            source={{ sourceType: 'happy_calling', sourceId: happyCallingId }}
            onBack={() => navigate(paths.crm.happyCallingFollowup(happyCallingId))}
            backLabel="Back to Add Follow-up"
        />
    );
}