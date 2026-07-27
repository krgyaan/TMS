import { useParams, useNavigate } from "react-router-dom";
import { LeadViewPage } from "./LeadViewPage";
import { paths } from "@/app/routes/paths";

export default function LeadShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const leadId = id ? Number(id) : null;

    if (!leadId) {
        return <div className="p-8 text-center text-muted-foreground">Invalid lead ID.</div>;
    }

    return (
        <LeadViewPage
            leadId={leadId}
            onBack={() => navigate(paths.crm.leads)}
            backLabel="Back to Leads"
        />
    );
}
