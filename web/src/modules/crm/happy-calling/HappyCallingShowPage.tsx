import { useParams, useNavigate } from "react-router-dom";
import { HappyCallingViewPage } from "./HappyCallingViewPage";
import { paths } from "@/app/routes/paths";

export default function HappyCallingShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const happyCallingId = id ? Number(id) : null;

    if (!happyCallingId || isNaN(happyCallingId)) {
        return <div className="p-8 text-center text-muted-foreground">Invalid Happy Calling ID.</div>;
    }

    return (
        <HappyCallingViewPage
            happyCallingId={happyCallingId}
            onBack={() => navigate(paths.crm.happyCalling)}
            backLabel="Back to Happy Calling"
        />
    );
}