import { useParams, useNavigate } from "react-router-dom";
import { LeadEnquiryViewPage } from "./LeadEnquiryViewPage";
import { paths } from "@/app/routes/paths";

export default function LeadEnquiryShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const enquiryId = id ? Number(id) : null;

    if (!enquiryId || isNaN(enquiryId)) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Invalid enquiry ID</p>
            </div>
        );
    }

    return (
        <LeadEnquiryViewPage
            enquiryId={enquiryId}
            onBack={() => navigate(paths.crm.enquiries)}
            backLabel="Back to Enquiries"
        />
    );
}
